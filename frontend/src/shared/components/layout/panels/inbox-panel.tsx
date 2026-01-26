import { Mail, MailOpen, Inbox, RefreshCw, PanelLeftClose, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Mock inbox
const mockInbox = [
  { id: '1', title: 'New comment on PR #123', from: 'GitHub', time: new Date(), read: false },
  { id: '2', title: 'Build completed', from: 'CI/CD', time: new Date(Date.now() - 3600000), read: true },
];

function getRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

interface InboxPanelProps {
  onClose?: () => void;
}

export function InboxPanel({ onClose }: InboxPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Inbox</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <MailOpen className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mockInbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No messages</p>
          </div>
        ) : (
          mockInbox.map((item) => (
            <div key={item.id} className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted cursor-pointer">
              {item.read ? (
                <MailOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              ) : (
                <Mail className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm block truncate', item.read ? 'text-foreground' : 'text-foreground font-medium')}>
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.from} · {getRelativeTime(item.time)}
                </span>
              </div>
              <button className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
