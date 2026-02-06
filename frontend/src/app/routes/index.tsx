import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import {
  FolderOpen, Loader2, Play, Plus, MessageSquare,
  ListTodo, Zap, DollarSign, Star, Clock, CheckCircle, FileEdit
} from 'lucide-react';
import { useRecentProjects, useFavoriteProjects } from '@/shared/hooks/use-projects-query';
import { useAnalyticsOverview } from '@/features/analytics/use-analytics';
import { useRunningSessions, useSessions } from '@/shared/hooks/use-sessions-query';
import { useFloatingPanels, useFolderPicker } from '@/shared/hooks';
import { useUpdateSettings } from '@/shared/hooks/use-settings';
import { tasksApi, projectsApi } from '@/adapters/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/shared/lib/utils';
import { CreateProjectDialog } from '@/shared/components/dialogs/create-project-dialog';
import { OnboardingWelcome } from '@/shared/components/onboarding-welcome';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl glass">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color || "bg-white/10")}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {subtext && <div className="text-[10px] text-muted-foreground/70">{subtext}</div>}
      </div>
    </div>
  );
}

// Quick Action Button
function QuickAction({ icon: Icon, label, onClick, primary, disabled, loading }: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          : "glass border border-border hover:bg-white/20 dark:hover:bg-white/10",
        (disabled || loading) && "opacity-50 cursor-not-allowed"
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
}

// Activity Item
function ActivityItem({ icon: Icon, text, time, color }: {
  icon: React.ElementType;
  text: string;
  time: string;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", color || "bg-white/10")}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">{text}</div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </div>
    </div>
  );
}

// Favorite Project Item
function FavoriteItem({ name, path, onClick }: { name: string; path: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
    >
      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate">{path}</div>
      </div>
    </button>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: recentProjects, isLoading: loadingProjects } = useRecentProjects(5);
  const { data: favoriteProjects } = useFavoriteProjects();
  const { data: runningSessions } = useRunningSessions();
  const { data: recentSessions } = useSessions({ limit: 10 });
  const { data: analyticsOverview } = useAnalyticsOverview(); // All projects overview
  const { openNewTaskPanel, openChatPanel } = useFloatingPanels();
  const updateSettings = useUpdateSettings();

  // State for Create Project dialog
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [pendingFolderPath, setPendingFolderPath] = useState('');
  const [pendingFolderName, setPendingFolderName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Folder picker hook
  const { selectFolder, isSelecting: isSelectingFolder } = useFolderPicker({
    onError: (error) => alert(error),
  });

  // Extract folder name from path for suggested project name
  const extractFolderName = (path: string): string => {
    const normalized = path.replace(/\\/g, '/').replace(/\/$/, '');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || 'Untitled Project';
  };

  // Handle Open Folder click - use native OS folder picker
  const handleOpenFolder = useCallback(async () => {
    const lastProjectPath = recentProjects?.[0]?.path;
    const result = await selectFolder('Select Project Folder', lastProjectPath);

    // User cancelled or error (handled by hook)
    if (!result || result.cancelled || !result.path) {
      return;
    }

    const folderPath = result.path;
    const folderName = result.name || extractFolderName(folderPath);

    try {
      // Check if project exists by path
      const projectResult = await projectsApi.getByPath(folderPath);

      if (projectResult.exists && projectResult.project) {
        // Project exists, navigate to Tasks
        await projectsApi.recordAccess(projectResult.project.id);
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        navigate({ to: '/tasks', search: { projectId: projectResult.project.id } });
      } else {
        // Project doesn't exist, show create dialog
        setPendingFolderPath(folderPath);
        setPendingFolderName(folderName);
        setShowCreateProjectDialog(true);
      }
    } catch (err) {
      console.error('Failed to check project:', err);
      alert(err instanceof Error ? err.message : 'Failed to check project');
    }
  }, [navigate, queryClient, recentProjects, selectFolder]);

  // Handle project creation
  const handleCreateProject = useCallback(async (name: string, setAsActive: boolean) => {
    setIsCreatingProject(true);
    try {
      const result = await projectsApi.create({
        name,
        path: pendingFolderPath,
      });

      // Set as active project if toggle is enabled
      if (setAsActive) {
        updateSettings.mutate({ currentActiveProjectId: result.project.id });
      }

      // Invalidate queries to refresh project lists
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // Navigate to Tasks with the new project
      navigate({ to: '/tasks', search: { projectId: result.project.id } });

      // Close dialog
      setShowCreateProjectDialog(false);
      setPendingFolderPath('');
      setPendingFolderName('');
    } catch (err) {
      console.error('Failed to create project:', err);
      alert(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [pendingFolderPath, navigate, queryClient, updateSettings]);

  // Handle dialog cancel
  const handleCancelCreateProject = useCallback(() => {
    setShowCreateProjectDialog(false);
    setPendingFolderPath('');
    setPendingFolderName('');
  }, []);

  // Fetch all tasks count
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => tasksApi.list({}),
    select: (data) => data.tasks,
  });

  // Calculate stats from real data
  const totalTasks = tasksData?.length || 0;
  const activeSessions = runningSessions?.length || 0;
  const totalCost = analyticsOverview?.totalCostUsd || 0;

  // Build recent activity from sessions
  const recentActivity = (recentSessions || []).slice(0, 5).map((session) => {
    const isCompleted = session.status === 'completed';
    const isFailed = session.status === 'failed';
    const isRunning = session.status === 'running';
    return {
      icon: isCompleted ? CheckCircle : isFailed ? FileEdit : isRunning ? Zap : Clock,
      text: `${isCompleted ? 'Completed' : isFailed ? 'Failed' : isRunning ? 'Running' : 'Session'} - ${session.name || 'Unnamed'}`,
      time: formatRelativeTime(session.updatedAt || session.createdAt),
      color: isCompleted ? 'bg-green-500/10 text-green-500' : isFailed ? 'bg-red-500/10 text-red-500' : isRunning ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground',
    };
  });

  if (loadingProjects) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-6 glass rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    );
  }

  // Empty state - New user onboarding
  if (!recentProjects || recentProjects.length === 0) {
    return (
      <>
        <OnboardingWelcome
          onOpenFolder={handleOpenFolder}
          onNewTask={openNewTaskPanel}
          onStartChat={openChatPanel}
          isSelectingFolder={isSelectingFolder}
        />

        {/* Create Project Dialog */}
        <CreateProjectDialog
          isOpen={showCreateProjectDialog}
          folderPath={pendingFolderPath}
          suggestedName={pendingFolderName}
          onConfirm={handleCreateProject}
          onCancel={handleCancelCreateProject}
          isLoading={isCreatingProject}
        />
      </>
    );
  }

  // Dashboard view
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="animate-float-up">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">Here's what's happening in your workspace</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-float-up" style={{ animationDelay: '0.05s' }}>
          <StatCard icon={ListTodo} label="Total Tasks" value={totalTasks} color="bg-blue-500/20 text-blue-400" />
          <StatCard icon={Zap} label="Active Sessions" value={activeSessions} color="bg-green-500/20 text-green-400" />
          <StatCard icon={DollarSign} label="Total Cost" value={`$${totalCost.toFixed(2)}`} color="bg-orange-500/20 text-orange-400" />
          <StatCard icon={MessageSquare} label="Sessions" value={analyticsOverview?.totalSessions || 0} color="bg-purple-500/20 text-purple-400" />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 animate-float-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-sm font-medium text-muted-foreground">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <QuickAction
              icon={Play}
              label="Continue Last Session"
              primary
              onClick={() => {
                const lastSession = recentSessions?.[0];
                if (lastSession) navigate({ to: '/tasks/$taskId', params: { taskId: lastSession.taskId } });
              }}
            />
            <QuickAction icon={Plus} label="New Task" onClick={openNewTaskPanel} />
            <QuickAction icon={MessageSquare} label="AI Chat" onClick={openChatPanel} />
            <QuickAction icon={FolderOpen} label="Open Folder" onClick={handleOpenFolder} loading={isSelectingFolder} />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6 animate-float-up" style={{ animationDelay: '0.15s' }}>
          {/* Recent Activity */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Recent Activity</h2>
            <div className="rounded-xl glass p-4">
              {recentActivity.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No recent activity</div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((item, i) => (
                    <ActivityItem key={i} {...item} />
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate({ to: '/tasks', search: { view: 'sessions' } })}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all activity →
              </button>
            </div>
          </div>

          {/* Favorite Projects */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Favorite Projects</h2>
            <div className="rounded-xl glass p-2">
              {(!favoriteProjects || favoriteProjects.length === 0) ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No favorite projects yet</p>
                  <p className="text-xs">Star a project to see it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {favoriteProjects.slice(0, 5).map((project) => (
                    <FavoriteItem
                      key={project.id}
                      name={project.name}
                      path={project.path}
                      onClick={() => navigate({ to: '/tasks', search: { projectId: project.id } })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Workspaces */}
        <div className="space-y-3 animate-float-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Recent Workspaces</h2>
            <button
              onClick={() => navigate({ to: '/tasks' })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate({ to: '/tasks', search: { projectId: project.id } })}
                className="text-left p-4 rounded-xl glass hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Project Dialog */}
        <CreateProjectDialog
          isOpen={showCreateProjectDialog}
          folderPath={pendingFolderPath}
          suggestedName={pendingFolderName}
          onConfirm={handleCreateProject}
          onCancel={handleCancelCreateProject}
          isLoading={isCreatingProject}
        />
      </div>
    </div>
  );
}
