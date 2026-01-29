import { GitBranch, Bell, Wifi, Settings, Plus, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/shared/hooks/use-settings';
import { projectsApi } from '@/adapters/api/projects-api';

interface StatusBarProps {
  onSettingsClick?: () => void;
  onNewTaskClick?: () => void;
}

export function StatusBar({ onSettingsClick, onNewTaskClick }: StatusBarProps) {
  const { data: settings } = useSettings();

  // Fetch active project details if set
  const { data: activeProject } = useQuery({
    queryKey: ['projects', settings?.currentActiveProjectId],
    queryFn: () => projectsApi.getById(settings!.currentActiveProjectId!),
    enabled: !!settings?.currentActiveProjectId,
    select: (data) => data.project,
  });

  return (
    <div className="h-6 bg-sidebar border-t border-sidebar-border flex items-center justify-between px-3 text-xs text-sidebar-foreground/70">
      <div className="flex items-center gap-4">
        {/* Active Project */}
        {activeProject && (
          <div className="flex items-center gap-1.5 text-primary" title={`Active Project: ${activeProject.path}`}>
            <FolderOpen className="w-3 h-3" />
            <span className="font-medium">{activeProject.name}</span>
          </div>
        )}
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
