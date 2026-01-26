import { useState, useMemo } from 'react';
import { NotificationItem } from './NotificationItem';
import { CategoryFilters } from './CategoryFilters';
import { useNotifications } from './useNotifications';
import type { NotificationType } from '../../domain/entities/notification';

export const NotificationList: React.FC = () => {
  const {
    notifications,
    loading,
    connected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationType | 'all', number> = {
      all: notifications.length,
      'approval-pending': 0,
      'approval-decided': 0,
      'task-completed': 0,
      'task-failed': 0,
      'session-completed': 0,
      'review-ready': 0,
      error: 0,
    };

    notifications.forEach((n) => {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
    });

    return counts;
  }, [notifications]);

  if (loading) {
    return (
      <div style={{ padding: '16px', height: '100%' }}>
        Loading notifications...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '14px' }}>Inbox</strong>
          {unreadCount > 0 && (
            <span
              style={{
                padding: '2px 8px',
                backgroundColor: '#007acc',
                color: 'white',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {unreadCount}
            </span>
          )}
          {connected && (
            <span style={{ fontSize: '11px', color: '#4caf50' }}>● Live</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'white',
              color: '#007acc',
              border: '1px solid #007acc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Mark All Read
          </button>
        )}
      </div>

      <CategoryFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={categoryCounts}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#888',
              fontSize: '14px',
            }}
          >
            No notifications
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
};
