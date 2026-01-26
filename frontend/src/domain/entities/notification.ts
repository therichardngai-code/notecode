export type NotificationType =
  | 'approval-pending'
  | 'approval-decided'
  | 'task-completed'
  | 'task-failed'
  | 'session-completed'
  | 'review-ready'
  | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  sessionId?: string;
  taskId?: string;
  approvalId?: string;
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
}
