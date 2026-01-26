import type { Notification } from '../../entities';

export interface INotificationRepository {
  findAll(): Promise<Notification[]>;
  findUnread(): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markRead(id: string): Promise<Notification>;
  markAllRead(): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}
