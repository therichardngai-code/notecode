import type { IApprovalRepository } from '../domain/ports/repositories/approval-repository.port';
import type { IMessageRepository } from '../domain/ports/repositories/message-repository.port';
import type { ApprovalStatus } from '../domain/entities';

export interface ApproveChangeInput {
  approvalId: string;
  status: ApprovalStatus;
  decidedBy?: string;
}

export class ApproveChangeUseCase {
  private approvalRepository: IApprovalRepository;
  private messageRepository: IMessageRepository;

  constructor(
    approvalRepository: IApprovalRepository,
    messageRepository: IMessageRepository
  ) {
    this.approvalRepository = approvalRepository;
    this.messageRepository = messageRepository;
  }

  async execute(input: ApproveChangeInput): Promise<void> {
    const { approvalId, status, decidedBy } = input;

    // Update approval status
    const approval = await this.approvalRepository.updateStatus(
      approvalId,
      status,
      decidedBy
    );

    // Update message block with new status
    const message = await this.messageRepository.findById(approval.messageId);
    if (!message) {
      throw new Error(`Message ${approval.messageId} not found`);
    }

    // Only update status if it's one of the allowed values for DiffBlock
    const allowedStatus: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected'];
    const diffStatus = allowedStatus.includes(status as any) ? status as 'pending' | 'approved' | 'rejected' : 'pending';

    const updatedBlocks = message.blocks.map((block) => {
      if (block.type === 'diff' && approval.type === 'diff') {
        const payload = approval.payload as { type: 'diff'; filePath: string };
        if (block.filePath === payload.filePath) {
          return { ...block, status: diffStatus };
        }
      }
      return block;
    });

    await this.messageRepository.update(approval.messageId, {
      blocks: updatedBlocks,
    });
  }
}
