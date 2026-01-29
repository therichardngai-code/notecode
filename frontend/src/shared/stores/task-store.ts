import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Task interface - shared across Board, Sessions, TaskDetail
export interface Task {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  priority?: 'low' | 'medium' | 'high';
  projectId?: string; // Project UUID for filtering
  project?: string; // Project name for display
  agent?: string;
  provider?: string;
  model?: string;
  assignee?: string;
  dueDate?: string;
  // Time tracking fields from API
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

// Session interface for SessionsView (matches sessions.tsx)
export interface Session {
  id: string;
  name: string;
  workspace: string;
  status: 'not-started' | 'in-progress' | 'review' | 'done' | 'archived';
  duration: string;
  lastActive: string;
  taskId?: string;
  project?: string;
  agent?: string;
  provider?: string;
  model?: string;
}

interface TaskState {
  // Tasks data (keyed by id for O(1) lookups)
  tasks: Record<string, Task>;
  sessions: Record<string, Session>;

  // Task CRUD
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, columnId: string) => void;

  // Session CRUD
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  // Selectors
  getTaskById: (id: string) => Task | undefined;
  getTasksArray: () => Task[];
  getSessionById: (id: string) => Session | undefined;
  getSessionsArray: () => Session[];
}

// Initial mock data (fallback when API unavailable)
const initialTasks: Record<string, Task> = {};

// Initial mock data (fallback when API unavailable)
const initialSessions: Record<string, Session> = {};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: initialTasks,
      sessions: initialSessions,

      // Task CRUD
      addTask: (task) => set((state) => ({ tasks: { ...state.tasks, [task.id]: task } })),
      updateTask: (id, updates) => set((state) => ({
        tasks: { ...state.tasks, [id]: { ...state.tasks[id], ...updates } }
      })),
      deleteTask: (id) => set((state) => {
        const { [id]: _, ...rest } = state.tasks;
        return { tasks: rest };
      }),
      moveTask: (id, columnId) => set((state) => ({
        tasks: { ...state.tasks, [id]: { ...state.tasks[id], columnId } }
      })),

      // Session CRUD
      addSession: (session) => set((state) => ({ sessions: { ...state.sessions, [session.id]: session } })),
      updateSession: (id, updates) => set((state) => ({
        sessions: { ...state.sessions, [id]: { ...state.sessions[id], ...updates } }
      })),
      deleteSession: (id) => set((state) => {
        const { [id]: _, ...rest } = state.sessions;
        return { sessions: rest };
      }),

      // Selectors
      getTaskById: (id) => get().tasks[id],
      getTasksArray: () => Object.values(get().tasks),
      getSessionById: (id) => get().sessions[id],
      getSessionsArray: () => Object.values(get().sessions),
    }),
    { name: 'task-store' }
  )
);
