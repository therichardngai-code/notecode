/**
 * Session Stream WebSocket Handler
 * Handles bidirectional communication for session streaming
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { ICliExecutor, CliOutput, CliSpawnConfig } from '../../domain/ports/gateways/cli-executor.port.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { Message } from '../../domain/entities/message.entity.js';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionStatus, ProviderType } from '../../domain/value-objects/task-status.vo.js';
import { ContextWindowUsage, PROVIDER_CONTEXT_CONFIG } from '../../domain/value-objects/context-window.vo.js';
import type { ApprovalInterceptorService } from '../gateways/approval-interceptor.service.js';
import type { CliToolInterceptorService } from '../services/cli-tool-interceptor.service.js';
import type { DiffExtractorService } from '../gateways/diff-extractor.service.js';

// Client -> Server message types
interface ClientMessage {
  type: 'user_input' | 'cancel' | 'approval_response';
  content?: string;
  // Optional overrides for resume
  model?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  files?: string[];  // Additional files to inject
  disableWebTools?: boolean;  // Disable WebSearch/WebFetch
  requestId?: string;
  approved?: boolean;
}

// Server -> Client message types
interface ServerMessage {
  type: 'output' | 'status' | 'approval_required' | 'diff_preview' | 'error' | 'context:update';
  data?: unknown;
  status?: string;
  message?: string;
}

// Approval request structure
export interface ApprovalRequest {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  category: string;
  timeoutAt: number;
}

// Diff preview structure
export interface DiffPreview {
  id: string;
  filePath: string;
  operation: string;
  content: string;
}

export class SessionStreamHandler {
  private clients = new Map<string, Set<WebSocket>>();
  private sessionProcessMap = new Map<string, number>();
  private approvalInterceptor: ApprovalInterceptorService | null = null;
  private toolInterceptor: CliToolInterceptorService | null = null;
  private diffExtractor: DiffExtractorService | null = null;
  // Track active streaming message ID per session (memory cache for quick lookup)
  private streamingMessageIds = new Map<string, string>();
  // Track last assistant message usage per session (for accurate context window, not accumulated billing)
  private lastAssistantUsage = new Map<string, Record<string, number>>();

  constructor(
    private wss: WebSocketServer,
    private cliExecutor: ICliExecutor,
    private sessionRepo: ISessionRepository,
    private messageRepo: IMessageRepository,
    private settingsRepo?: ISettingsRepository,
    private taskRepo?: ITaskRepository
  ) {
    this.setupConnectionHandler();
  }

  /**
   * Set approval interceptor (called after construction to avoid circular deps)
   */
  setApprovalInterceptor(interceptor: ApprovalInterceptorService): void {
    this.approvalInterceptor = interceptor;
  }

  /**
   * Set CLI tool interceptor for blocking hooks
   */
  setToolInterceptor(interceptor: CliToolInterceptorService): void {
    this.toolInterceptor = interceptor;
  }

  /**
   * Set diff extractor for tracking file changes
   */
  setDiffExtractor(extractor: DiffExtractorService): void {
    this.diffExtractor = extractor;
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      // Extract sessionId from URL: /ws/session/:sessionId
      const sessionId = req.url?.match(/\/ws\/session\/([^/?]+)/)?.[1];

      if (!sessionId) {
        this.sendError(ws, 'Missing session ID');
        ws.close(4000, 'Missing session ID');
        return;
      }

      // Verify session exists
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) {
        this.sendError(ws, 'Session not found');
        ws.close(4001, 'Session not found');
        return;
      }

      // Add client to session's client set
      if (!this.clients.has(sessionId)) {
        this.clients.set(sessionId, new Set());
      }
      this.clients.get(sessionId)!.add(ws);

      // ALWAYS send historical messages first (catch-up for late-connecting clients)
      await this.sendCatchUpMessages(ws, sessionId);

      // Subscribe to future CLI output if session is still running
      const isProcessRunning = session.processId !== null && this.cliExecutor.isRunning(session.processId);
      if (isProcessRunning && session.processId !== null) {
        this.subscribeToCliOutput(sessionId, session.processId);
      }

      // Determine correct status (infer from process state if DB not yet updated)
      let statusToSend = session.status;
      if (!isProcessRunning && session.status === SessionStatus.RUNNING) {
        // GAP: Process exited but DB not updated yet - infer completed
        statusToSend = SessionStatus.COMPLETED;
      }
      this.sendToClient(ws, { type: 'status', status: statusToSend });

      // Handle incoming messages from client
      ws.on('message', async (data: Buffer) => {
        try {
          const msg: ClientMessage = JSON.parse(data.toString());
          await this.handleClientMessage(sessionId, msg);
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            message: 'Invalid message format',
          });
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.get(sessionId)?.delete(ws);
        if (this.clients.get(sessionId)?.size === 0) {
          this.clients.delete(sessionId);
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
      });

      // Send current session status
      this.sendToClient(ws, {
        type: 'status',
        status: session.status,
      });
    });
  }

  private async handleClientMessage(sessionId: string, msg: ClientMessage): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      this.broadcast(sessionId, {
        type: 'error',
        message: 'Session not found',
      });
      return;
    }

    switch (msg.type) {
      case 'user_input':
        if (msg.content) {
          try {
            // Check if CLI process is still running
            const isRunning = session.processId && this.cliExecutor.isRunning(session.processId);

            if (!isRunning) {
              // Process dead - need to resume session with full message (includes overrides)
              await this.resumeSession(session, msg);
            } else {
              // Process alive - send directly to stdin
              await this.cliExecutor.sendMessage(session.processId!, msg.content);
            }

            // Save user message
            const userMessage = Message.createUserMessage(
              randomUUID(),
              sessionId,
              msg.content
            );
            await this.messageRepo.save(userMessage);

            // Broadcast saved message with ID for frontend dedup
            this.broadcast(sessionId, {
              type: 'output',
              data: {
                type: 'user_message_saved',
                messageId: userMessage.id,
                content: msg.content,
                timestamp: userMessage.timestamp,
              },
            });
          } catch (error) {
            this.broadcast(sessionId, {
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to send message',
            });
          }
        }
        break;

      case 'cancel':
        if (!session.processId || !this.cliExecutor.isRunning(session.processId)) {
          this.broadcast(sessionId, {
            type: 'error',
            message: 'No running process to cancel',
          });
          break;
        }
        try {
          await this.cliExecutor.terminate(session.processId);
          // Update session status to cancelled
          session.cancel();
          await this.sessionRepo.save(session);
          this.broadcast(sessionId, {
            type: 'status',
            status: 'cancelled',
          });
        } catch (error) {
          this.broadcast(sessionId, {
            type: 'error',
            message: 'Failed to cancel session',
          });
        }
        break;

      case 'approval_response':
        // Hook-based approval: Don't send stdin response
        // The hook polls /api/approvals/:id/status for the decision
        // Sending y/n to stdin corrupts Claude CLI's JSON streaming mode
        console.log(`[WS] Approval response received for session ${sessionId} - hook handles via API polling`);
        break;
    }
  }

  private subscribeToCliOutput(sessionId: string, processId: number): void {
    // Avoid duplicate subscriptions
    if (this.sessionProcessMap.has(sessionId)) return;
    this.sessionProcessMap.set(sessionId, processId);

    // Track if we've captured CLI's session_id (for --resume to work)
    let cliSessionIdCaptured = false;

    // Subscribe to output
    this.cliExecutor.onOutput(processId, async (output: CliOutput) => {
      // Capture CLI's session_id on first occurrence and update session.providerSessionId
      if (!cliSessionIdCaptured) {
        const cliSessionId = this.extractCliSessionId(output);
        if (cliSessionId) {
          cliSessionIdCaptured = true;
          await this.updateProviderSessionId(sessionId, cliSessionId);
        }
      }
      // Intercept tool_use - can be separate event OR embedded in assistant message
      const toolUseBlocks = this.extractToolUseBlocks(output);

      for (const toolBlock of toolUseBlocks) {
        // Check CLI tool interceptor (blocking hooks) first
        if (this.toolInterceptor) {
          const dangerCheck = this.toolInterceptor.checkDangerousPatterns(
            toolBlock.name,
            toolBlock.input
          );

          if (dangerCheck.dangerous) {
            this.broadcast(sessionId, {
              type: 'output',
              data: {
                type: 'tool_blocked',
                toolName: toolBlock.name,
                reason: dangerCheck.reason,
                severity: 'danger',
              },
            });
            continue; // Skip this tool
          }
        }

        // Check approval interceptor
        if (this.approvalInterceptor) {
          const decision = await this.approvalInterceptor.checkApproval(
            sessionId,
            toolBlock.name,
            toolBlock.input,
            toolBlock.id
          );

          // If rejected, notify frontend
          if (!decision.approved) {
            this.broadcast(sessionId, {
              type: 'output',
              data: {
                type: 'approval_rejected',
                toolName: toolBlock.name,
                reason: decision.reason,
              },
            });
          }
        }

        // Extract and save diff for file operations (Edit, Write, Bash)
        // User can approve/reject individual diffs later via diff popup
        if (this.diffExtractor) {
          try {
            const diff = this.diffExtractor.extractFromToolUse(sessionId, {
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
            });
            if (diff) {
              await this.diffExtractor.saveDiff(diff);
              // Notify frontend of new diff
              this.broadcast(sessionId, {
                type: 'diff_preview',
                data: {
                  id: diff.id,
                  filePath: diff.filePath,
                  operation: diff.operation,
                  status: diff.status,
                },
              });
            }
          } catch (err) {
            console.error('[DiffExtractor] Failed to extract diff:', err);
          }
        }
      }

      // Handle streaming events - save to DB and send delta only
      if (output.type === 'stream_event') {
        const delta = this.extractStreamDelta(output);
        if (delta) {
          await this.handleStreamDelta(sessionId, delta);
        }
        return; // Don't broadcast raw stream_event, we send delta instead
      }

      // Check if we streamed deltas for this session (to avoid double emission)
      const hadStreamingDeltas = this.streamingMessageIds.has(sessionId);

      // Skip raw message broadcast if deltas were sent (prevents duplicate content)
      if (output.type === 'message' && hadStreamingDeltas) {
        // Send completion signal only - frontend already has content via deltas
        const streamingMsgId = this.streamingMessageIds.get(sessionId);
        this.broadcast(sessionId, {
          type: 'output',
          data: {
            type: 'message_complete',
            messageId: streamingMsgId,
            status: 'complete',
          },
        });
      } else {
        // Non-streamed outputs OR non-message types - broadcast as usual
        this.broadcast(sessionId, {
          type: 'output',
          data: output,
        });
      }

      // Handle final assistant message - mark streaming complete
      if (output.type === 'message') {
        const msgContent = output.content as Record<string, unknown>;

        // Track usage from assistant message (content.usage contains per-API-call data)
        if (msgContent?.usage) {
          this.lastAssistantUsage.set(sessionId, msgContent.usage as Record<string, number>);
        }

        const streamingMsgId = this.streamingMessageIds.get(sessionId);
        if (streamingMsgId) {
          // Mark streaming message as complete (don't create new one)
          try {
            await this.messageRepo.markComplete(streamingMsgId);
          } catch (error) {
            console.error('Failed to mark message complete:', error);
          }
          this.streamingMessageIds.delete(sessionId);
        } else {
          // No streaming message exists (edge case) - create one as before
          const content = typeof output.content === 'string'
            ? output.content
            : JSON.stringify(output.content);

          const assistantMessage = Message.createAssistantMessage(
            randomUUID(),
            sessionId,
            [{ type: 'text', content }]
          );

          try {
            await this.messageRepo.save(assistantMessage);
          } catch (error) {
            console.error('Failed to save message:', error);
          }
        }
      }

      // Handle result event - update session status and token usage
      if (output.type === 'result') {
        const result = output.content as Record<string, unknown>;
        const subtype = result.subtype as string;
        const isSuccess = subtype === 'success';

        // Update session in database
        const session = await this.sessionRepo.findById(sessionId);
        if (session) {
          // Use last assistant message's usage (actual context) instead of result's accumulated usage
          const lastUsage = this.lastAssistantUsage.get(sessionId);
          const resultUsage = result.usage as Record<string, number> | undefined;

          // For token counts: use last assistant message (actual context state)
          // For cost: use result event (accumulated billing total)
          const tokenUsage = {
            input: lastUsage?.input_tokens ?? 0,
            output: resultUsage?.output_tokens ?? 0,  // Output is cumulative, use result
            cacheRead: lastUsage?.cache_read_input_tokens ?? 0,
            cacheCreation: lastUsage?.cache_creation_input_tokens ?? 0,
            total: (lastUsage?.input_tokens ?? 0) + (resultUsage?.output_tokens ?? 0),
            estimatedCostUsd: (result.total_cost_usd as number) ?? 0,
          };

          // Build model usage from result (for billing purposes)
          const modelName = (result.model as string) ?? session.provider ?? 'unknown';
          const modelUsage = [{
            model: modelName,
            inputTokens: lastUsage?.input_tokens ?? 0,
            outputTokens: resultUsage?.output_tokens ?? 0,
            costUsd: (result.total_cost_usd as number) ?? 0,
          }];

          // Compute context window from last assistant message (actual context, not accumulated)
          if (session.provider && lastUsage) {
            const contextWindow = this.computeContextWindow(
              lastUsage.input_tokens ?? 0,
              lastUsage.cache_creation_input_tokens ?? 0,
              lastUsage.cache_read_input_tokens ?? 0,
              session.provider
            );
            session.updateContextWindow(contextWindow);

            console.log(`[SessionStream] Context: ${contextWindow.contextPercent}% (${contextWindow.totalContextTokens.toLocaleString()}/${contextWindow.contextSize.toLocaleString()} tokens)`);

            // Broadcast to frontend via WebSocket
            this.broadcast(sessionId, {
              type: 'context:update',
              data: {
                sessionId,
                contextWindow
              }
            });

            // Log warning if critical
            const config = PROVIDER_CONTEXT_CONFIG[session.provider];
            if (contextWindow.contextPercent >= config.criticalThreshold) {
              console.warn(`[SessionStream] ⚠️ Context window at ${contextWindow.contextPercent}% - consider Renew`);
            }
          }

          // Only update if session is still running (not cancelled)
          if (session.status === 'running') {
            if (isSuccess) {
              session.complete(tokenUsage, modelUsage);
            } else {
              session.fail(subtype || 'unknown error');
              session.tokenUsage = tokenUsage;
              session.modelUsage = modelUsage;
            }
            await this.sessionRepo.save(session);
          }
        }

        this.broadcast(sessionId, {
          type: 'status',
          status: isSuccess ? 'completed' : 'failed',
        });
      }

    });

    // Subscribe to exit - persist status to DB as fallback
    this.cliExecutor.onExit(processId, async (code: number) => {
      const terminalStatus = code === 0 ? 'completed' : 'failed';

      // Persist terminal status to DB (fallback if result event missed)
      try {
        const session = await this.sessionRepo.findById(sessionId);
        if (session && !['completed', 'failed', 'cancelled'].includes(session.status)) {
          session.status = terminalStatus as SessionStatus;
          session.endedAt = new Date();
          await this.sessionRepo.save(session);
        }
      } catch (error) {
        console.error('[WS] Failed to persist terminal status:', error);
      }

      this.broadcast(sessionId, {
        type: 'status',
        status: terminalStatus,
      });
      // Cleanup session tracking data
      this.sessionProcessMap.delete(sessionId);
      this.lastAssistantUsage.delete(sessionId);
    });
  }

  private broadcast(sessionId: string, message: ServerMessage): void {
    const data = JSON.stringify(message);
    const clients = this.clients.get(sessionId);
    clients?.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendToClient(ws, { type: 'error', message });
  }

  /**
   * Send catch-up messages for late-connecting clients
   * Called on EVERY WS connect to ensure client has all past messages
   * Includes streaming buffer if there's an active streaming message
   */
  private async sendCatchUpMessages(ws: WebSocket, sessionId: string): Promise<void> {
    const messages = await this.messageRepo.findBySessionId(sessionId);
    for (const message of messages) {
      const content = message.blocks.length > 0
        ? message.blocks.map(b => ('content' in b ? b.content : '')).join('')
        : '';

      // For streaming messages, send as streaming_buffer type
      if (message.isStreaming()) {
        this.sendToClient(ws, {
          type: 'output',
          data: {
            type: 'streaming_buffer',
            messageId: message.id,
            content,
            offset: message.streamOffset,
            status: 'streaming',
          },
        });
      } else {
        this.sendToClient(ws, {
          type: 'output',
          data: {
            type: 'message',
            messageId: message.id,
            content: { role: message.role, content },
            timestamp: message.timestamp,
            status: 'complete',
          },
        });
      }
    }
  }

  /**
   * Extract tool_use blocks from CLI output (can be separate event or embedded in assistant message)
   */
  private extractToolUseBlocks(output: CliOutput): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    const blocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
    const content = output.content as Record<string, unknown>;

    // Case 1: Direct tool_use event
    if (output.type === 'tool_use') {
      blocks.push({
        id: String(content.id ?? ''),
        name: String(content.tool ?? content.name ?? ''),
        input: (content.input ?? {}) as Record<string, unknown>,
      });
      return blocks;
    }

    // Case 2: Embedded in assistant message content array
    if (output.type === 'message') {
      const message = (content.message ?? content) as Record<string, unknown>;
      const contentArray = message.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(contentArray)) {
        for (const block of contentArray) {
          if (block.type === 'tool_use') {
            blocks.push({
              id: String(block.id ?? ''),
              name: String(block.name ?? ''),
              input: (block.input ?? {}) as Record<string, unknown>,
            });
          }
        }
      }
    }

    return blocks;
  }

  /**
   * Register a new session's CLI process for streaming
   * Called after StartSessionUseCase spawns the process
   */
  registerSession(sessionId: string, processId: number): void {
    this.subscribeToCliOutput(sessionId, processId);
  }

  /**
   * Send approval request to connected clients
   */
  sendApprovalRequest(sessionId: string, request: ApprovalRequest): void {
    this.broadcast(sessionId, {
      type: 'approval_required',
      data: request,
    });
  }

  /**
   * Send diff preview to connected clients
   */
  sendDiffPreview(sessionId: string, preview: DiffPreview): void {
    this.broadcast(sessionId, {
      type: 'diff_preview',
      data: preview,
    });
  }

  /**
   * Resume a session by spawning new CLI process with --resume flag
   * Uses session's providerSessionId to restore conversation context
   * Fetches current task config and computes delta for contextFiles/skills
   */
  private async resumeSession(session: Session, msg: ClientMessage): Promise<void> {
    // Require providerSessionId for resume
    if (!session.providerSessionId) {
      throw new Error('Cannot resume: session has no providerSessionId');
    }

    // Fetch task for current config
    const task = this.taskRepo ? await this.taskRepo.findById(session.taskId) : null;
    const settings = this.settingsRepo ? await this.settingsRepo.getGlobal() : null;

    // Compute delta for context files (new files since last message)
    const currentContextFiles = task?.contextFiles ?? [];
    const newContextFiles = currentContextFiles.filter(
      f => !session.includedContextFiles.includes(f)
    );

    // Compute delta for skills (new skills since last message)
    const currentSkills = task?.skills ?? [];
    const newSkills = currentSkills.filter(
      s => !session.includedSkills.includes(s)
    );

    // Build prompt with user message + delta files/skills
    let prompt = msg.content ?? '';

    // Include any explicitly passed files from message
    const explicitFiles = msg.files ?? [];
    const allNewFiles = [...new Set([...newContextFiles, ...explicitFiles])];

    if (allNewFiles.length > 0) {
      prompt += `\n\n<new-context-files>\n${allNewFiles.map(f => `@${f}`).join('\n')}\n</new-context-files>`;
    }
    if (newSkills.length > 0) {
      prompt += `\n\n<new-skills>\n${newSkills.map(s => `@${s}`).join('\n')}\n</new-skills>`;
    }

    // Build disallowed tools list (task config + message override)
    let disallowedTools = task?.tools?.mode === 'blocklist' ? [...task.tools.tools] : undefined;
    if (msg.disableWebTools) {
      disallowedTools = disallowedTools ?? [];
      if (!disallowedTools.includes('WebSearch')) disallowedTools.push('WebSearch');
      if (!disallowedTools.includes('WebFetch')) disallowedTools.push('WebFetch');
    }

    // Build CLI spawn config with current task settings
    const cliConfig: CliSpawnConfig = {
      provider: session.provider ?? ProviderType.ANTHROPIC,
      model: msg.model ?? task?.model ?? settings?.defaultModel ?? 'sonnet',
      workingDir: session.workingDir,
      sessionId: session.id,
      resumeSessionId: session.providerSessionId,
      initialPrompt: prompt,
      permissionMode: msg.permissionMode ?? task?.permissionMode ?? 'default',
      allowedTools: task?.tools?.mode === 'allowlist' ? task.tools.tools : undefined,
      disallowedTools,
      agentName: task?.agentRole ?? undefined,
    };

    // Notify clients that session is resuming
    this.broadcast(session.id, {
      type: 'status',
      status: 'resuming',
    });

    // Spawn new CLI process
    const cliProcess = await this.cliExecutor.spawn(cliConfig);

    // Update session with new process info directly
    // (don't use entity methods - they have status preconditions that don't apply to CLI resume)
    // NOTE: Don't update providerSessionId here - let async capture in subscribeToCliOutput
    // update it when CLI emits the new session_id (the CLI generates a NEW session ID on resume)
    session.status = SessionStatus.RUNNING;
    session.processId = cliProcess.processId;
    session.startedAt = session.startedAt ?? new Date(); // Keep original start if exists

    // Update included context to match current task (for next delta)
    session.includedContextFiles = [...currentContextFiles, ...explicitFiles];
    session.includedSkills = [...currentSkills];
    session.updatedAt = new Date();

    await this.sessionRepo.save(session);

    // Subscribe to new process output
    this.sessionProcessMap.delete(session.id);
    this.subscribeToCliOutput(session.id, cliProcess.processId);

    // Notify clients that session is running
    this.broadcast(session.id, {
      type: 'status',
      status: SessionStatus.RUNNING,
    });
  }

  // === CLI Session ID Capture ===

  /**
   * Extract CLI's session_id from output (needed for --resume to work)
   */
  private extractCliSessionId(output: CliOutput): string | null {
    const content = output.content as Record<string, unknown> | undefined;
    return (content?.session_id as string)
      ?? (content?.session as string)
      ?? ((content as { message?: { session_id?: string } })?.message?.session_id)
      ?? null;
  }

  /**
   * Update session's providerSessionId with CLI's actual session ID
   * - First sessions: Get new ID from CLI
   * - Retry sessions: Skip update (inherit parent's ID)
   * - Fork/Renew sessions: Get NEW ID from CLI (new conversation branch)
   * Also updates task.lastProviderSessionId for future resumes
   */
  private async updateProviderSessionId(sessionId: string, cliSessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) return;

      // ONLY skip retry sessions - they inherit parent's providerSessionId
      // Fork and renew sessions GET NEW provider session ID from CLI!
      if (session.resumeMode === 'retry') {
        console.log(`[SessionStream] Skipping providerSessionId update for retry session ${sessionId.slice(0, 8)} (inherits parent's ID)`);
        return;
      }

      // Update for: first sessions, fork sessions, renew sessions
      if (session.providerSessionId !== cliSessionId) {
        session.providerSessionId = cliSessionId;
        session.updatedAt = new Date();
        await this.sessionRepo.save(session);

        // Also update task's lastProviderSessionId for future resumes
        if (this.taskRepo) {
          const task = await this.taskRepo.findById(session.taskId);
          if (task && task.lastProviderSessionId !== cliSessionId) {
            task.updateLastProviderSessionId(cliSessionId);
            await this.taskRepo.save(task);
            console.log(`[SessionStream] Updated task & session providerSessionId: ${cliSessionId.slice(0, 8)} (mode: ${session.resumeMode ?? 'first'})`);
          }
        } else {
          console.log(`[SessionStream] Updated session providerSessionId: ${cliSessionId.slice(0, 8)} (task not updated - no repo)`);
        }
      }
    } catch (error) {
      console.error('[SessionStream] Failed to update providerSessionId:', error);
    }
  }

  // === Streaming Support Methods ===

  /**
   * Extract delta text from stream_event output
   * Claude stream_event format: { event: { type: 'content_block_delta', delta: { text: '...' } } }
   */
  private extractStreamDelta(output: CliOutput): string | null {
    const content = output.content as Record<string, unknown>;
    const event = content.event as Record<string, unknown> | undefined;

    if (!event) return null;

    // Handle content_block_delta event type
    if (event.type === 'content_block_delta') {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta?.text && typeof delta.text === 'string') {
        return delta.text;
      }
    }

    return null;
  }

  /**
   * Handle streaming delta - create or append to streaming message
   */
  private async handleStreamDelta(sessionId: string, delta: string): Promise<void> {
    let messageId = this.streamingMessageIds.get(sessionId);

    if (!messageId) {
      // First delta - create streaming message
      const streamingMsg = Message.createStreamingMessage(
        randomUUID(),
        sessionId,
        delta
      );
      try {
        await this.messageRepo.save(streamingMsg);
        messageId = streamingMsg.id;
        this.streamingMessageIds.set(sessionId, messageId);
      } catch (error) {
        console.error('Failed to create streaming message:', error);
        return;
      }
    } else {
      // Subsequent delta - append to existing message
      try {
        await this.messageRepo.appendContent(messageId, delta);
      } catch (error) {
        console.error('Failed to append delta:', error);
        return;
      }
    }

    // Get current offset for frontend sync
    const streamingMsg = await this.messageRepo.findById(messageId);
    const offset = streamingMsg?.streamOffset ?? 0;

    // Broadcast delta to clients (not full content)
    this.broadcast(sessionId, {
      type: 'output',
      data: {
        type: 'delta',
        messageId,
        offset,
        text: delta,
      },
    });
  }

  /**
   * Compute context window usage from token counts
   * Matches statusline.cjs logic: includes ALL token types (input + cache_creation + cache_read)
   */
  private computeContextWindow(
    inputTokens: number,
    cacheCreationTokens: number,
    cacheReadTokens: number,
    provider: ProviderType
  ): ContextWindowUsage {
    const config = PROVIDER_CONTEXT_CONFIG[provider];

    // IMPORTANT: Include ALL tokens (matches statusline.cjs lines 404-406)
    // input + cache_creation + cache_read
    const totalContextTokens = inputTokens + cacheCreationTokens + cacheReadTokens;

    // Add provider-specific buffer to estimate effective usage
    // Buffer accounts for autocompact reserved space
    const effectiveTokens = totalContextTokens + config.autocompactBuffer;
    const contextPercent = Math.min(100,
      Math.round((effectiveTokens / config.contextSize) * 100)
    );

    return {
      inputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalContextTokens,
      contextSize: config.contextSize,
      contextPercent,
      provider,
      timestamp: new Date()
    };
  }
}
