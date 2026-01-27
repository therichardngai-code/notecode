import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Kanban, Plus, MoreHorizontal, Tag, Calendar, User, ExternalLink, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { columnDefs, priorityConfig } from '@/shared/config/task-config';
import { useTaskStore, type Task } from '@/shared/stores/task-store';

// Redirect /board to /tasks - Board is a view mode within Tasks
export const Route = createFileRoute('/board')({
  component: () => <Navigate to="/tasks" />,
});

// Task filter interface (matches prototype TaskFilters)
export interface TaskFilters {
  project?: string[];
  agent?: string[];
  provider?: string[];
  model?: string[];
  priority?: string[];
  taskStatus?: string[];
  sessionStatus?: string[];
}

function PriorityBadge({ priority }: { priority?: Task['priority'] }) {
  if (!priority) return null;
  const config = priorityConfig[priority];
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
      {config.label}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onOpenInNewTab?: () => void;
  onMoveToArchived?: () => void;
  onDelete?: () => void;
}

function TaskCard({ task, onClick, onOpenInNewTab, onMoveToArchived, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div onClick={onClick} className="p-3 rounded-xl glass hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-foreground leading-tight">{task.title}</span>
        <div className="relative shrink-0">
          <div
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn('p-1 rounded hover:bg-muted transition-colors cursor-pointer', showMenu ? 'opacity-100 bg-muted' : 'opacity-0 group-hover:opacity-100')}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {showMenu && createPortal(
            <div
              ref={menuRef}
              className="fixed w-44 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-[110]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInNewTab?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToArchived?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                Move to archived
              </div>
              <div className="border-t border-white/20 dark:border-white/10 my-1" />
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
      {task.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

function BoardColumn({ column, onTaskClick, onOpenInNewTab, onMoveToArchived, onDelete }: { column: Column; onTaskClick?: (id: string) => void; onOpenInNewTab?: (id: string) => void; onMoveToArchived?: (id: string) => void; onDelete?: (id: string) => void }) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
        <span className="font-medium text-sm text-foreground">{column.title}</span>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{column.tasks.length}</span>
      </div>
      <div className="space-y-2">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task.id)} onOpenInNewTab={() => onOpenInNewTab?.(task.id)} onMoveToArchived={() => onMoveToArchived?.(task.id)} onDelete={() => onDelete?.(task.id)} />
        ))}
      </div>
    </div>
  );
}

// Session reference for cross-filtering
interface SessionRef {
  id: string;
  taskId: string;
  status: string;
}

// Helper to filter tasks based on TaskFilters (global filters)
function filterTasks(tasks: Task[], filters: TaskFilters, sessions: SessionRef[] = []): Task[] {
  return tasks.filter((task) => {
    if (filters.project?.length && !filters.project.includes(task.project || '')) return false;
    if (filters.agent?.length && !filters.agent.includes(task.agent || '')) return false;
    if (filters.provider?.length && !filters.provider.includes(task.provider || '')) return false;
    if (filters.model?.length && !filters.model.includes(task.model || '')) return false;
    if (filters.priority?.length && !filters.priority.includes(task.priority || '')) return false;
    if (filters.taskStatus?.length && !filters.taskStatus.includes(task.columnId)) return false;
    // Session status filter: show tasks that have sessions with matching status
    if (filters.sessionStatus?.length) {
      const taskSessions = sessions.filter(s => s.taskId === task.id);
      const hasMatchingSession = taskSessions.some(s => filters.sessionStatus!.includes(s.status));
      if (!hasMatchingSession) return false;
    }
    return true;
  });
}

export interface BoardViewProps {
  hideHeader?: boolean;
  filters?: TaskFilters;
  searchQuery?: string;
  tasks?: Task[]; // Optional: pass API tasks, falls back to store
  sessions?: SessionRef[]; // Sessions for cross-filtering by sessionStatus
  isLoading?: boolean;
  onTaskClick?: (taskId: string) => void;
  onOpenInNewTab?: (taskId: string) => void;
  onMoveToArchived?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function BoardView({ hideHeader, filters = {}, searchQuery = '', tasks: propTasks, sessions = [], isLoading: _isLoading, onTaskClick, onOpenInNewTab, onMoveToArchived, onDelete }: BoardViewProps) {
  const tasksRecord = useTaskStore((state) => state.tasks);
  const storeTasks = Object.values(tasksRecord);
  // Use prop tasks if provided, else fall back to store
  const tasks = propTasks ?? storeTasks;

  // Apply filters (including cross-filter by sessionStatus)
  const filteredTasks = filterTasks(tasks, filters, sessions);

  // Apply search query
  const searchedTasks = searchQuery.trim()
    ? filteredTasks.filter((task) => task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredTasks;

  // Check if any filter is active
  const isFilterActive = Object.values(filters).some((arr) => arr && arr.length > 0) || searchQuery.trim();

  // Build ALL 6 columns from columnDefs
  const allColumns: Column[] = columnDefs.map((col) => ({
    id: col.id,
    title: col.title,
    color: col.color,
    tasks: searchedTasks.filter((task) => task.columnId === col.id),
  }));

  // Hide empty columns ONLY when filter is active (prototype behavior)
  const columns = isFilterActive ? allColumns.filter((col) => col.tasks.length > 0) : allColumns;

  const totalTasks = searchedTasks.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header - only show if not embedded */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
              <Kanban className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Board</h1>
              <span className="text-sm text-muted-foreground">{totalTasks} tasks</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sidebar-border bg-sidebar text-sm font-medium hover:bg-sidebar-accent transition-colors">
              <Tag className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>
        </div>
      )}

      {/* Board - shows ALL 6 columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 h-full">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onTaskClick={(taskId) => onTaskClick?.(taskId)}
              onOpenInNewTab={(taskId) => onOpenInNewTab?.(taskId)}
              onMoveToArchived={(taskId) => onMoveToArchived?.(taskId)}
              onDelete={(taskId) => onDelete?.(taskId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
