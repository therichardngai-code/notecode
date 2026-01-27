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
import type { ApprovalInterceptorService } from '../gateways/approval-interceptor.service.js';
import type { CliToolInterceptorService } from '../services/cli-tool-interceptor.service.js';

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
  type: 'output' | 'status' | 'approval_required' | 'diff_preview' | 'error';
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

      // Subscribe to CLI output if session is running
      if (session.processId && this.cliExecutor.isRunning(session.processId)) {
        this.subscribeToCliOutput(sessionId, session.processId);
      }

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
        if (!session.processId || !this.cliExecutor.isRunning(session.processId)) {
          this.broadcast(sessionId, {
            type: 'error',
            message: 'No running process to approve',
          });
          break;
        }
        if (msg.approved !== undefined) {
          try {
            await this.cliExecutor.sendApprovalResponse(session.processId, msg.approved);
          } catch (error) {
            this.broadcast(sessionId, {
              type: 'error',
              message: 'Failed to send approval response',
            });
          }
        }
        break;
    }
  }

  private subscribeToCliOutput(sessionId: string, processId: number): void {
    // Avoid duplicate subscriptions
    if (this.sessionProcessMap.has(sessionId)) return;
    this.sessionProcessMap.set(sessionId, processId);

    // Subscribe to output
    this.cliExecutor.onOutput(processId, async (output: CliOutput) => {
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
      }

      // Broadcast to all clients watching this session
      this.broadcast(sessionId, {
        type: 'output',
        data: output,
      });

      // Save assistant messages to database
      if (output.type === 'message') {
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

      // Handle result event - update session status and token usage
      if (output.type === 'result') {
        const result = output.content as Record<string, unknown>;
        const subtype = result.subtype as string;
        const isSuccess = subtype === 'success';

        // Update session in database
        const session = await this.sessionRepo.findById(sessionId);
        if (session) {
          // Build token usage from result
          const usage = result.usage as Record<string, number> | undefined;
          const tokenUsage = {
            input: usage?.input_tokens ?? 0,
            output: usage?.output_tokens ?? 0,
            cacheRead: usage?.cache_read_input_tokens ?? 0,
            cacheCreation: usage?.cache_creation_input_tokens ?? 0,
            total: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
            estimatedCostUsd: (result.total_cost_usd as number) ?? 0,
          };

          // Build model usage from result
          const modelName = (result.model as string) ?? session.provider ?? 'unknown';
          const modelUsage = [{
            model: modelName,
            inputTokens: usage?.input_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? 0,
            costUsd: (result.total_cost_usd as number) ?? 0,
          }];

          if (isSuccess) {
            session.complete(tokenUsage, modelUsage);
          } else {
            session.fail(subtype || 'unknown error');
            session.tokenUsage = tokenUsage;
            session.modelUsage = modelUsage;
          }

          await this.sessionRepo.save(session);
        }

        this.broadcast(sessionId, {
          type: 'status',
          status: isSuccess ? 'completed' : 'failed',
        });
      }
    });

    // Subscribe to exit
    this.cliExecutor.onExit(processId, (code: number) => {
      this.broadcast(sessionId, {
        type: 'status',
        status: code === 0 ? 'completed' : 'failed',
      });
      this.sessionProcessMap.delete(sessionId);
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

    // Update session with new process info and context tracking
    session.resume();
    session.start(cliProcess.sessionId, cliProcess.processId);

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
}
