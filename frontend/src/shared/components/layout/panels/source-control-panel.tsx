import { GitBranch, GitCommit, RefreshCw, PanelLeftClose, Trash2 } from 'lucide-react';

// Mock changes
const mockChanges = [
  { id: '1', file: 'App.tsx', status: 'modified', time: new Date() },
  { id: '2', file: 'Navigator.tsx', status: 'modified', time: new Date(Date.now() - 3600000) },
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

interface SourceControlPanelProps {
  onClose?: () => void;
}

export function SourceControlPanel({ onClose }: SourceControlPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Source Control</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <GitCommit className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs text-muted-foreground">Changes</div>
        {mockChanges.map((c) => (
          <div key={c.id} className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted cursor-pointer">
            <GitBranch className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground block truncate">{c.file}</span>
              <span className="text-xs text-muted-foreground">
                {c.status} · {getRelativeTime(c.time)}
              </span>
            </div>
            <button className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 shrink-0">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
