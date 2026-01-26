import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Session } from '../../../domain/entities';
import { cn } from '../../../shared/lib/utils';

interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onSelect: () => void;
  onOpenInNewTab?: (sessionId: string) => void;
  onMoveToArchived?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

const statusConfig = {
  queued: {
    label: 'Queued',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: Clock,
  },
  running: {
    label: 'Running',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: Play,
  },
  paused: {
    label: 'Paused',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Pause,
  },
  completed: {
    label: 'Completed',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: XCircle,
  },
  archived: {
    label: 'Archived',
    color: '#9ca3af',
    bgColor: '#f9fafb',
    icon: Archive,
  },
};

function formatDuration(durationMs?: number): string {
  if (!durationMs) return '0m';
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatLastActive(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Active now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function SessionCard({
  session,
  isSelected,
  onSelect,
  onOpenInNewTab,
  onMoveToArchived,
  onDelete,
}: SessionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const config = statusConfig[session.status];
  const StatusIcon = config.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border transition-colors text-left group',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-accent'
      )}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: config.bgColor }}
      >
        <StatusIcon
          className="w-4 h-4"
          style={{
            color: config.color,
            fill: session.status === 'running' ? config.color : 'none',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-foreground truncate">
            {session.name}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1.5"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">
          {session.workingDir}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(session.durationMs)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatLastActive(session.updatedAt)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
            {session.provider}
          </span>
        </div>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors cursor-pointer',
            showMenu ? 'opacity-100 bg-muted' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenInNewTab?.(session.id);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </div>
            {session.status !== 'archived' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToArchived?.(session.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                Move to archived
              </div>
            )}
            <div className="border-t border-border my-1" />
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(session.id);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
