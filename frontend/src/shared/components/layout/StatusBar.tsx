import { GitBranch, Wifi, Settings, Plus, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { projectsApi } from '@/adapters/api/projects-api';
import { gitApi } from '@/adapters/api/git-api';

interface StatusBarProps {
  onSettingsClick?: () => void;
  onNewTaskClick?: () => void;
}

export function StatusBar({ onSettingsClick, onNewTaskClick }: StatusBarProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  // Fetch active project details if set — clear stale ID on 404
  const { data: activeProject } = useQuery({
    queryKey: ['projects', settings?.currentActiveProjectId],
    queryFn: async () => {
      try {
        return await projectsApi.getById(settings!.currentActiveProjectId!);
      } catch (err: unknown) {
        // Project no longer exists (DB reset) — clear stale reference
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
          updateSettings.mutate({ currentActiveProjectId: null });
          return null;
        }
        throw err;
      }
    },
    enabled: !!settings?.currentActiveProjectId,
    select: (data) => data?.project ?? null,
    retry: false, // Don't retry 404s
  });

  // Fetch git branch for active project — lightweight, never errors
  const { data: gitBranch } = useQuery({
    queryKey: ['git-branch', settings?.currentActiveProjectId],
    queryFn: () => gitApi.getProjectBranch(settings!.currentActiveProjectId!),
    enabled: !!settings?.currentActiveProjectId,
    staleTime: 10_000, // 10s — safe to re-fetch on project change
    retry: false,
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
        {/* Git branch — only show when project is a git repo */}
        {gitBranch?.isGitRepo && gitBranch.branch && (
          <div className="flex items-center gap-1.5" title={`Branch: ${gitBranch.branch}${gitBranch.isDirty ? ' (uncommitted changes)' : ''}`}>
            <GitBranch className="w-3 h-3" />
            <span>{gitBranch.branch}{gitBranch.isDirty ? ' •' : ''}</span>
          </div>
        )}
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
