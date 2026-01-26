import { useEffect, useState } from 'react';
import type { Notification } from '../../domain/entities/notification';
import { createSSEClient } from '../../infrastructure/realtime/sse-client';

interface UseNotificationsOptions {
  sseUrl?: string;
  autoConnect?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'approval-pending',
        title: 'Approval Required',
        body: 'Agent needs approval to proceed with file modification',
        sessionId: 'sess-123',
        read: false,
        actionUrl: '/approvals/1',
        actionLabel: 'Review',
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        id: '2',
        type: 'task-completed',
        title: 'Task Completed',
        body: 'Build task finished successfully',
        taskId: 'task-456',
        read: false,
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        id: '3',
        type: 'review-ready',
        title: 'Code Review Ready',
        body: 'PR #42 is ready for review',
        read: true,
        readAt: new Date(Date.now() - 10800000),
        actionUrl: '/reviews/42',
        actionLabel: 'View PR',
        createdAt: new Date(Date.now() - 14400000),
      },
    ];

    setNotifications(mockNotifications);
    setLoading(false);

    if (options.autoConnect && options.sseUrl) {
      const sseClient = createSSEClient({
        url: options.sseUrl,
        onMessage: (data) => {
          const notification = data as Notification;
          setNotifications((prev) => [notification, ...prev]);
        },
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
        onError: (error) => {
          console.error('SSE connection error:', error);
          setConnected(false);
        },
      });

      sseClient.connect();

      return () => {
        sseClient.disconnect();
      };
    }
  }, [options.sseUrl, options.autoConnect]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date() } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    connected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
