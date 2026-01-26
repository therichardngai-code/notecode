import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Kanban, LayoutList, Filter, X, ChevronDown, Folder, Bot, Sparkles, Zap, Search, Plus, Cpu } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useUIStore } from '@/shared/stores';
import { useTaskStore } from '@/shared/stores/task-store';
import { filterOptions } from '@/shared/config/task-config';
import { BoardView } from './board';
import { SessionsView, mapApiSessionToUI } from './sessions';
import { useProjects } from '@/shared/hooks/use-projects-query';
import { useTasks } from '@/shared/hooks/use-tasks-query';
import { useSessions, useStopSession, useDeleteSession } from '@/shared/hooks/use-sessions-query';

// Search params for handling ?id=taskId to auto-open task detail
type TasksSearch = { id?: string; session?: string };

export const Route = createFileRoute('/tasks/')({
  component: TasksIndexPage,
  validateSearch: (search: Record<string, unknown>): TasksSearch => ({
    id: typeof search.id === 'string' ? search.id : undefined,
    session: typeof search.session === 'string' ? search.session : undefined,
  }),
});

type ViewMode = 'board' | 'sessions';

function FilterDropdown({
  label,
  icon: Icon,
  value = [],
  options,
  onChange,
  onClear
}: {
  label: string;
  icon: React.ElementType;
  value?: string[];
  options: { id: string; label: string }[];
  onChange: (value: string[]) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasValue = value.length > 0;
  const displayLabel = hasValue
    ? value.length === 1
      ? options.find(o => o.id === value[0])?.label || label
      : `${label} (${value.length})`
    : label;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
          hasValue
            ? 'bg-primary/10 border-primary/30 text-foreground'
            : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{displayLabel}</span>
        {hasValue ? (
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="ml-0.5 hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (isSelected) {
                      onChange(value.filter(v => v !== opt.id));
                    } else {
                      onChange([...value, opt.id]);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left',
                    isSelected && 'bg-accent'
                  )}
                >
                  <span className={cn(
                    'w-3.5 h-3.5 border rounded flex items-center justify-center',
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  )}>
                    {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TasksIndexPage() {
  const { openNewTaskPanel, openTaskDetailPanel, openTaskAsTab } = useUIStore();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Fetch projects from API
  const { data: projects, isLoading: projectsLoading } = useProjects();

  // Auto-select first project when loaded
  useEffect(() => {
    if (projects?.length && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Fetch tasks from API when project selected
  const { data: apiTasks, isLoading: tasksLoading } = useTasks(selectedProjectId || '');

  // Fetch sessions from API (all sessions, not task-filtered)
  // Note: Backend defaults to 20, pass higher limit to show more
  const { data: apiSessions, isLoading: sessionsLoading } = useSessions({ limit: 100 });
  const stopSessionMutation = useStopSession();
  const deleteSessionMutation = useDeleteSession();

  // Map API sessions to UI format
  const mappedSessions = apiSessions?.map(mapApiSessionToUI) || [];

  // Map API tasks to BoardView format
  const mappedTasks = apiTasks?.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    columnId: t.status,
    priority: t.priority as 'low' | 'medium' | 'high' | undefined,
    project: projects?.find(p => p.id === t.projectId)?.name,
    agent: t.agentRole || undefined,
    provider: t.provider || undefined,
    model: t.model || undefined,
    assignee: t.assignee || undefined,
    dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : undefined,
  }));

  // Get URL search params for auto-opening task detail
  const { id: taskIdFromUrl, session: sessionIdFromUrl } = Route.useSearch();
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // Auto-open task detail when id/session is in URL (for "Open in new tab" feature)
  useEffect(() => {
    if (taskIdFromUrl) {
      openTaskDetailPanel(taskIdFromUrl);
    } else if (sessionIdFromUrl && mappedSessions.length > 0) {
      const session = mappedSessions.find(s => s.id === sessionIdFromUrl);
      if (session?.taskId) {
        openTaskDetailPanel(session.taskId);
      }
    }
  }, [taskIdFromUrl, sessionIdFromUrl, mappedSessions, openTaskDetailPanel]);

  const activeFilterCount = Object.values(filters).filter((arr) => arr && arr.length > 0).length;

  // Handle task click - open detail panel
  const handleTaskClick = (taskId: string) => {
    openTaskDetailPanel(taskId);
  };

  // Handle session click - open linked task's detail panel
  const handleSessionClick = (sessionId: string) => {
    const session = mappedSessions.find(s => s.id === sessionId);
    if (session?.taskId) {
      openTaskDetailPanel(session.taskId);
    }
  };

  // Get store actions and tasks data
  const { updateTask, deleteTask } = useTaskStore();
  const tasks = useTaskStore((state) => state.tasks);

  // Handle open in new tab (Tab Block, not browser tab)
  const handleOpenInNewTab = (taskId: string) => {
    const task = tasks[taskId];
    openTaskAsTab(taskId, task?.title || 'Task');
  };

  // Handle move to archived
  const handleMoveToArchived = (taskId: string) => {
    updateTask(taskId, { columnId: 'archived' });
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  // Session handlers
  const handleSessionOpenInNewTab = (sessionId: string) => {
    const session = mappedSessions.find(s => s.id === sessionId);
    if (session?.taskId) {
      const task = tasks[session.taskId];
      openTaskAsTab(session.taskId, task?.title || session.name || 'Task');
    }
  };

  const handleSessionStop = (sessionId: string) => {
    stopSessionMutation.mutate(sessionId);
  };

  const handleSessionDelete = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sidebar-border bg-sidebar text-sm font-medium hover:bg-muted/50 transition-colors min-w-[140px]"
            >
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{projectsLoading ? 'Loading...' : selectedProject?.name || 'Select Project'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </button>
            {showProjectDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-64 overflow-y-auto">
                  {projects?.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowProjectDropdown(false);
                      }}
                      className={cn(
                        'w-full flex flex-col px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                        project.id === selectedProjectId && 'bg-accent'
                      )}
                    >
                      <span className="font-medium text-foreground">{project.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{project.path}</span>
                    </button>
                  ))}
                  {!projects?.length && !projectsLoading && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === 'board' ? 'Search tasks...' : 'Search sessions...'}
              className="w-64 pl-9 pr-8 py-1.5 rounded-lg border border-sidebar-border bg-sidebar text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:text-foreground text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Task Button */}
          <button
            onClick={openNewTaskPanel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Kanban className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('sessions')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'sessions'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutList className="w-4 h-4" />
              Sessions
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              showFilters || activeFilterCount > 0
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-muted/20 flex-wrap">
          <FilterDropdown
            label="Project"
            icon={Folder}
            value={filters.project}
            options={filterOptions.project}
            onChange={(value) => setFilters(prev => ({ ...prev, project: value }))}
            onClear={() => setFilters(prev => { const { project, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Agent"
            icon={Bot}
            value={filters.agent}
            options={filterOptions.agent}
            onChange={(value) => setFilters(prev => ({ ...prev, agent: value }))}
            onClear={() => setFilters(prev => { const { agent, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Provider"
            icon={Sparkles}
            value={filters.provider}
            options={filterOptions.provider}
            onChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}
            onClear={() => setFilters(prev => { const { provider, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Model"
            icon={Cpu}
            value={filters.model}
            options={filterOptions.model}
            onChange={(value) => setFilters(prev => ({ ...prev, model: value }))}
            onClear={() => setFilters(prev => { const { model, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Priority"
            icon={Zap}
            value={filters.priority}
            options={filterOptions.priority}
            onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
            onClear={() => setFilters(prev => { const { priority, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Task Status"
            icon={Filter}
            value={filters.taskStatus}
            options={filterOptions.taskStatus}
            onChange={(value) => setFilters(prev => ({ ...prev, taskStatus: value }))}
            onClear={() => setFilters(prev => { const { taskStatus, ...rest } = prev; return rest; })}
          />
          <FilterDropdown
            label="Session Status"
            icon={LayoutList}
            value={filters.sessionStatus}
            options={filterOptions.sessionStatus}
            onChange={(value) => setFilters(prev => ({ ...prev, sessionStatus: value }))}
            onClear={() => setFilters(prev => { const { sessionStatus, ...rest } = prev; return rest; })}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({})}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Content - Embed BoardView or SessionsView with filters */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <BoardView
            hideHeader
            filters={filters}
            searchQuery={searchQuery}
            tasks={mappedTasks}
            sessions={mappedSessions}
            isLoading={tasksLoading}
            onTaskClick={handleTaskClick}
            onOpenInNewTab={handleOpenInNewTab}
            onMoveToArchived={handleMoveToArchived}
            onDelete={handleDeleteTask}
          />
        ) : (
          <SessionsView
            hideHeader
            filters={filters}
            searchQuery={searchQuery}
            sessions={mappedSessions}
            tasks={mappedTasks}
            isLoading={sessionsLoading}
            onSessionClick={handleSessionClick}
            onOpenInNewTab={handleSessionOpenInNewTab}
            onStop={handleSessionStop}
            onDelete={handleSessionDelete}
          />
        )}
      </div>
    </div>
  );
}
