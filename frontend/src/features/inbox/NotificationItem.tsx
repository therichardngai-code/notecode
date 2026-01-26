import type { Notification } from '../../domain/entities/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
}) => {
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'approval-pending': return '#ff9800';
      case 'approval-decided': return '#4caf50';
      case 'task-completed': return '#4caf50';
      case 'task-failed': return '#f44336';
      case 'review-ready': return '#2196f3';
      case 'error': return '#f44336';
      default: return '#757575';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'approval-pending': return 'Approval';
      case 'approval-decided': return 'Approved';
      case 'task-completed': return 'Task Done';
      case 'task-failed': return 'Task Failed';
      case 'review-ready': return 'Review';
      case 'error': return 'Error';
      default: return type;
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div
      style={{
        padding: '12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: notification.read ? 'white' : '#f0f8ff',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <span
          style={{
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: getTypeColor(notification.type),
            borderRadius: '3px',
            textTransform: 'uppercase',
          }}
        >
          {getTypeLabel(notification.type)}
        </span>
        <span style={{ fontSize: '11px', color: '#888' }}>
          {formatTime(notification.createdAt)}
        </span>
        {!notification.read && (
          <span
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#007acc',
              borderRadius: '50%',
              marginLeft: 'auto',
            }}
          />
        )}
      </div>

      <div style={{ marginBottom: '4px' }}>
        <strong style={{ fontSize: '14px' }}>{notification.title}</strong>
      </div>

      {notification.body && (
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
          {notification.body}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {notification.actionUrl && notification.actionLabel && (
          <button
            onClick={() => window.location.href = notification.actionUrl!}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {notification.actionLabel}
          </button>
        )}
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              backgroundColor: 'white',
              color: '#007acc',
              border: '1px solid #007acc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Mark Read
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: 'white',
            color: '#888',
            border: '1px solid #d0d0d0',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
