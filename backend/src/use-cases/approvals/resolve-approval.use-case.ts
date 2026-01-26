/**
 * Resolve Approval Use Case
 * Handles user approval/rejection decisions
 */

import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import { ApprovalStatus } from '../../domain/entities/approval.entity.js';

export type ApprovalAction = 'approve' | 'reject' | 'allowForSession' | 'acceptEdits' | 'yolo';

export interface ResolveApprovalResponse {
  success: boolean;
  error?: string;
}

// Callback type for notifying interceptor about resolved approvals
export type ApprovalResolvedCallback = (
  requestId: string,
  action: ApprovalAction,
  decidedBy: string
) => Promise<void>;

export class ResolveApprovalUseCase {
  private onResolved: ApprovalResolvedCallback | null = null;

  constructor(private approvalRepo: IApprovalRepository) {}

  /**
   * Set callback to notify interceptor when approval is resolved
   */
  setOnResolvedCallback(callback: ApprovalResolvedCallback): void {
    this.onResolved = callback;
  }

  async execute(
    approvalId: string,
    action: ApprovalAction,
    decidedBy: string = 'user'
  ): Promise<ResolveApprovalResponse> {
    // Find approval
    const approval = await this.approvalRepo.findById(approvalId);

    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      return { success: false, error: 'Approval already resolved' };
    }

    // Check if expired
    if (approval.isExpired()) {
      approval.timeout();
      await this.approvalRepo.save(approval);
      return { success: false, error: 'Approval has expired' };
    }

    // Update approval status
    if (action === 'approve') {
      approval.approve(decidedBy);
    } else {
      approval.reject(decidedBy);
    }

    await this.approvalRepo.save(approval);

    // Notify interceptor to resolve pending Promise
    if (this.onResolved) {
      await this.onResolved(approvalId, action, decidedBy);
    }

    // NOTE: Don't send stdin response when using hook-based approval
    // The hook handles CLI communication via stdout, not stdin.
    // Sending 'y\n' to stdin corrupts stream-json input mode.

    return { success: true };
  }
}
