/**
 * Create Approval Use Case
 * Creates approval records for tool operations that require user confirmation
 */

import { randomUUID } from 'crypto';
import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import { IEventBus, ApprovalPendingEvent } from '../../domain/events/event-bus.js';
import {
  Approval,
  ApprovalType,
  ToolCategory,
  ApprovalPayload,
} from '../../domain/entities/approval.entity.js';
import {
  ApprovalGateConfig,
  DEFAULT_APPROVAL_GATE,
} from '../../domain/value-objects/approval-gate-config.vo.js';

export interface CreateApprovalRequest {
  sessionId: string;
  messageId?: string;
  type: ApprovalType;
  toolName: string;
  payload: Record<string, unknown>;
}

export interface CreateApprovalResponse {
  success: boolean;
  approval?: Approval;
  autoApproved: boolean;
  error?: string;
}

export class CreateApprovalUseCase {
  constructor(
    private approvalRepo: IApprovalRepository,
    private eventBus: IEventBus,
    private gateConfig: ApprovalGateConfig = DEFAULT_APPROVAL_GATE
  ) {}

  async execute(request: CreateApprovalRequest): Promise<CreateApprovalResponse> {
    // Categorize the tool
    const category = this.categorize(
      request.toolName,
      request.payload,
      this.gateConfig
    );

    // Auto-approve safe tools
    if (category === 'safe') {
      return { success: true, autoApproved: true };
    }

    // Create approval payload
    const approvalPayload: ApprovalPayload = {
      type: request.type,
      toolName: request.toolName,
      toolInput: request.payload,
    };

    // Extract file path if present
    const filePath = this.extractFilePath(request.payload);
    if (filePath) {
      approvalPayload.filePath = filePath;
    }

    // Create approval record
    const approval = Approval.create(
      randomUUID(),
      request.sessionId,
      request.type,
      approvalPayload,
      category,
      this.gateConfig.timeoutSeconds,
      this.gateConfig.defaultOnTimeout,
      request.messageId
    );

    await this.approvalRepo.save(approval);

    // Publish event
    this.eventBus.publish([
      new ApprovalPendingEvent(
        approval.id,
        request.sessionId,
        request.toolName,
        approval.timeoutAt
      ),
    ]);

    return { success: true, approval, autoApproved: false };
  }

  private categorize(
    toolName: string,
    payload: Record<string, unknown>,
    config: ApprovalGateConfig
  ): ToolCategory {
    // Check dangerous patterns first
    if (this.matchesDangerousPattern(toolName, payload, config)) {
      return 'dangerous';
    }

    // Check auto-allow list
    if (config.autoAllowTools.includes(toolName)) {
      return 'safe';
    }

    // Check requires-approval list
    if (config.requireApprovalTools.includes(toolName)) {
      return 'requires-approval';
    }

    // Default to safe for unknown tools
    return 'safe';
  }

  private matchesDangerousPattern(
    toolName: string,
    payload: Record<string, unknown>,
    config: ApprovalGateConfig
  ): boolean {
    // Check command patterns for Bash tool
    if (toolName === 'Bash') {
      const command = String(payload.command ?? '');
      return config.dangerousPatterns.commands.some((pattern) =>
        new RegExp(pattern, 'i').test(command)
      );
    }

    // Check file patterns for file operations
    const filePath = this.extractFilePath(payload);
    if (filePath) {
      return config.dangerousPatterns.files.some((pattern) =>
        new RegExp(pattern, 'i').test(filePath)
      );
    }

    return false;
  }

  private extractFilePath(payload: Record<string, unknown>): string | null {
    const path =
      payload.file_path ?? payload.filePath ?? payload.path ?? payload.notebook_path;
    return typeof path === 'string' ? path : null;
  }
}
