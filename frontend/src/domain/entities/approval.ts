import type { DiffHunk } from './message';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

export type ApprovalType = 'diff' | 'tool' | 'command';

export type ApprovalPayload =
  | { type: 'diff'; filePath: string; hunks: DiffHunk[] }
  | { type: 'tool'; toolName: string; input: Record<string, unknown> }
  | { type: 'command'; command: string };

export interface Approval {
  id: string;
  sessionId: string;
  messageId: string;
  type: ApprovalType;
  payload: ApprovalPayload;
  toolCategory: 'safe' | 'requires-approval' | 'dangerous';
  matchedPattern?: string;
  status: ApprovalStatus;
  decidedAt?: Date;
  decidedBy?: string;
  timeoutAt: Date;
  autoAction: 'approve' | 'deny';
  createdAt: Date;
}
