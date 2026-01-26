import type { INotificationRepository } from '../domain/ports/repositories/notification-repository.port';
import type { Notification } from '../domain/entities/notification';

export class MarkNotificationReadUseCase {
  notificationRepository: INotificationRepository;

  constructor(notificationRepository: INotificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  async execute(notificationId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findById(notificationId);

      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (notification.read) {
        return notification;
      }

      const updatedNotification = await this.notificationRepository.markRead(notificationId);
      return updatedNotification;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }
      throw new Error('Failed to mark notification as read: Unknown error');
    }
  }

  async executeAll(): Promise<void> {
    try {
      await this.notificationRepository.markAllRead();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
      }
      throw new Error('Failed to mark all notifications as read: Unknown error');
    }
  }
}
