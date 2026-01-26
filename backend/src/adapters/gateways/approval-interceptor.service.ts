/**
 * Approval Interceptor Service
 * Intercepts tool_use events and checks if approval is required
 *
 * NOTE: When using hook-based approval (PreToolUse hooks), this interceptor
 * should NOT create approvals - the hook handles that via /api/approvals/request.
 * This interceptor is for WebSocket-based approval flow only.
 */

import { randomUUID } from 'crypto';
import {
  ApprovalGateConfig,
  DEFAULT_APPROVAL_GATE,
} from '../../domain/value-objects/approval-gate-config.vo.js';
import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import { IEventBus, ApprovalPendingEvent } from '../../domain/events/event-bus.js';
import { SessionStreamHandler } from '../websocket/session-stream.handler.js';
import { Approval, ToolCategory } from '../../domain/entities/approval.entity.js';

export interface SessionApprovalState {
  sessionId: string;
  allowedTools: Set<string>;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  useHookApproval: boolean; // When true, skip interceptor approval (hook handles it)
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
}

interface PendingApproval {
  resolve: (decision: ApprovalDecision) => void;
  timeout: NodeJS.Timeout;
  sessionId: string;
}

export class ApprovalInterceptorService {
  private sessionStates = new Map<string, SessionApprovalState>();
  private pendingApprovals = new Map<string, PendingApproval>();

  constructor(
    private approvalRepo: IApprovalRepository,
    private wsHandler: SessionStreamHandler,
    private eventBus: IEventBus,
    private config: ApprovalGateConfig = DEFAULT_APPROVAL_GATE
  ) {}

  getOrCreateState(sessionId: string): SessionApprovalState {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        sessionId,
        allowedTools: new Set(),
        permissionMode: 'default',
        useHookApproval: true, // Default to hook-based approval
      });
    }
    return this.sessionStates.get(sessionId)!;
  }

  // Mark session as using hook-based approval (interceptor should not create approvals)
  setHookApprovalMode(sessionId: string, enabled: boolean): void {
    const state = this.getOrCreateState(sessionId);
    state.useHookApproval = enabled;
  }

  async checkApproval(
    sessionId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolUseId: string
  ): Promise<ApprovalDecision> {
    const state = this.getOrCreateState(sessionId);

    // If using hook-based approval, auto-approve here (hook handles blocking)
    if (state.useHookApproval) {
      return { approved: true, reason: 'Hook handles approval' };
    }

    // 1. YOLO/bypass mode - approve all
    if (state.permissionMode === 'bypassPermissions') {
      return { approved: true };
    }

    // 2. Accept edits mode - auto-approve file operations
    if (state.permissionMode === 'acceptEdits' && this.isEditTool(toolName)) {
      return { approved: true };
    }

    // 3. Already allowed for session
    if (state.allowedTools.has(toolName)) {
      return { approved: true };
    }

    // 4. Auto-allow safe tools
    if (this.config.autoAllowTools.includes(toolName)) {
      return { approved: true };
    }

    // 5. Check for dangerous patterns
    if (this.matchesDangerousPattern(toolName, toolInput)) {
      return this.requestUserApproval(
        sessionId,
        toolName,
        toolInput,
        toolUseId,
        'dangerous'
      );
    }

    // 6. Check if requires approval
    if (this.config.requireApprovalTools.includes(toolName)) {
      return this.requestUserApproval(
        sessionId,
        toolName,
        toolInput,
        toolUseId,
        'requires-approval'
      );
    }

    // 7. Default - approve
    return { approved: true };
  }

  private async requestUserApproval(
    sessionId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolUseId: string,
    category: ToolCategory
  ): Promise<ApprovalDecision> {
    const requestId = randomUUID();
    const timeoutAt = new Date(Date.now() + this.config.timeoutSeconds * 1000);

    // Create approval record with toolUseId
    const approvalType = this.isFileOperation(toolName) ? 'diff' : 'tool';
    const approval = Approval.create(
      requestId,
      sessionId,
      approvalType,
      { type: approvalType, toolName, toolInput, toolUseId },
      category,
      this.config.timeoutSeconds,
      this.config.defaultOnTimeout
    );

    await this.approvalRepo.save(approval);

    // Publish event
    this.eventBus.publish([
      new ApprovalPendingEvent(requestId, sessionId, toolName, timeoutAt),
    ]);

    // Send to frontend via WebSocket
    this.wsHandler.sendApprovalRequest(sessionId, {
      requestId,
      toolName,
      toolInput,
      category,
      timeoutAt: timeoutAt.getTime(),
    });

    console.log(`[Approval] Waiting for user response: ${toolName} (${category})`);

    // Wait for user response or timeout
    return new Promise<ApprovalDecision>((resolve) => {
      const timeout = setTimeout(async () => {
        this.pendingApprovals.delete(requestId);
        approval.timeout();
        await this.approvalRepo.save(approval);

        console.log(`[Approval] Timeout: ${toolName} - default: ${this.config.defaultOnTimeout}`);

        resolve({
          approved: this.config.defaultOnTimeout === 'approve',
          reason: 'Timeout',
        });
      }, this.config.timeoutSeconds * 1000);

      this.pendingApprovals.set(requestId, { resolve, timeout, sessionId });
    });
  }

  async handleUserResponse(
    requestId: string,
    action: 'approve' | 'reject' | 'allowForSession' | 'acceptEdits' | 'yolo',
    _decidedBy: string = 'user'
  ): Promise<void> {
    const pending = this.pendingApprovals.get(requestId);
    if (!pending) {
      console.log(`[Approval] No pending approval for ${requestId}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingApprovals.delete(requestId);

    // Get approval for toolName (don't modify - ResolveApprovalUseCase already did)
    const approval = await this.approvalRepo.findById(requestId);
    const toolName = approval?.payload?.toolName ?? 'unknown';

    const state = this.getOrCreateState(pending.sessionId);

    // Handle special modes and resolve Promise (approval entity already updated by use case)
    switch (action) {
      case 'approve':
        pending.resolve({ approved: true });
        break;

      case 'reject':
        pending.resolve({ approved: false, reason: 'User rejected' });
        break;

      case 'allowForSession':
        state.allowedTools.add(toolName);
        pending.resolve({ approved: true });
        break;

      case 'acceptEdits':
        state.permissionMode = 'acceptEdits';
        pending.resolve({ approved: true });
        break;

      case 'yolo':
        state.permissionMode = 'bypassPermissions';
        pending.resolve({ approved: true });
        break;
    }

    console.log(`[Approval] ${action}: ${toolName}`);
  }

  private isEditTool(name: string): boolean {
    return ['Write', 'Edit', 'NotebookEdit'].includes(name);
  }

  private isFileOperation(name: string): boolean {
    return ['Write', 'Edit', 'NotebookEdit', 'Bash'].includes(name);
  }

  private matchesDangerousPattern(
    toolName: string,
    toolInput: Record<string, unknown>
  ): boolean {
    // Check command patterns for Bash
    if (toolName === 'Bash') {
      const command = String(toolInput.command ?? '');
      for (const pattern of this.config.dangerousPatterns.commands) {
        if (new RegExp(pattern, 'i').test(command)) {
          return true;
        }
      }
    }

    // Check file patterns for file operations
    if (this.isFileOperation(toolName)) {
      const filePath = String(
        toolInput.file_path ?? toolInput.filePath ?? toolInput.path ?? ''
      );
      for (const pattern of this.config.dangerousPatterns.files) {
        if (new RegExp(pattern, 'i').test(filePath)) {
          return true;
        }
      }
    }

    return false;
  }

  clearSessionState(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }

  hasPendingApproval(sessionId: string): boolean {
    for (const pending of this.pendingApprovals.values()) {
      if (pending.sessionId === sessionId) return true;
    }
    return false;
  }
}
