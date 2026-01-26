import { GitBranch, Bell, Wifi, Settings, Plus } from 'lucide-react';

interface StatusBarProps {
  onSettingsClick?: () => void;
  onNewTaskClick?: () => void;
}

export function StatusBar({ onSettingsClick, onNewTaskClick }: StatusBarProps) {
  return (
    <div className="h-6 bg-sidebar border-t border-sidebar-border flex items-center justify-between px-3 text-xs text-sidebar-foreground/70">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onNewTaskClick}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-sidebar-accent transition-colors"
          title="New Task"
        >
          <Plus className="w-3 h-3" />
          <span>New Task</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Bell className="w-3 h-3" />
          <span>3</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors"
          title="Settings"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
