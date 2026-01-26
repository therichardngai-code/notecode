import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Task interface - shared across Board, Sessions, TaskDetail
export interface Task {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  priority?: 'low' | 'medium' | 'high';
  project?: string;
  agent?: string;
  provider?: string;
  model?: string;
  assignee?: string;
  dueDate?: string;
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

// Initial mock data
const initialTasks: Record<string, Task> = {
  '1': { id: '1', title: 'Implement authentication flow', description: 'Build JWT-based auth with refresh tokens', columnId: 'not-started', priority: 'high', project: 'notecode', agent: 'coder', provider: 'anthropic', model: 'claude-sonnet' },
  '2': { id: '2', title: 'Design database schema', description: 'Create ERD and migration scripts', columnId: 'in-progress', priority: 'high', project: 'notecode', agent: 'planner', provider: 'anthropic', model: 'claude-opus', assignee: 'planner' },
  '3': { id: '3', title: 'Write unit tests for API', description: 'Add test coverage for all endpoints', columnId: 'review', priority: 'medium', project: 'gemkit-cli', agent: 'tester', provider: 'google', model: 'gemini-2.5-pro' },
  '4': { id: '4', title: 'Update documentation', columnId: 'done', priority: 'low', project: 'notecode', agent: 'researcher', provider: 'anthropic', model: 'claude-sonnet', dueDate: 'Jan 28' },
  '5': { id: '5', title: 'Research best practices', description: 'Research and document API design patterns', columnId: 'not-started', priority: 'medium', project: 'ai-dashboard', agent: 'researcher', provider: 'google', model: 'gemini-3-pro' },
  '6': { id: '6', title: 'Deprecated feature removal', description: 'Remove old v1 API endpoints', columnId: 'cancelled', priority: 'low', project: 'gemkit-cli', agent: 'coder', provider: 'openai', model: 'gpt-5.2-codex' },
  '7': { id: '7', title: 'Old migration scripts', description: 'Archived database migrations', columnId: 'archived', priority: 'low', project: 'notecode', agent: 'planner', provider: 'anthropic', model: 'claude-sonnet' },
};

const initialSessions: Record<string, Session> = {
  's1': { id: 's1', name: 'Implement authentication flow', workspace: 'notecode', status: 'in-progress', duration: '2h 15m', lastActive: 'Just now', taskId: '1', project: 'notecode', agent: 'coder', provider: 'anthropic', model: 'claude-sonnet' },
  's2': { id: 's2', name: 'Design database schema', workspace: 'gemkit-cli', status: 'review', duration: '45m', lastActive: '10 min ago', taskId: '2', project: 'notecode', agent: 'planner', provider: 'anthropic', model: 'claude-opus' },
  's3': { id: 's3', name: 'API testing session', workspace: 'ai-dashboard', status: 'done', duration: '1h 30m', lastActive: '2 hours ago', taskId: '3', project: 'gemkit-cli', agent: 'tester', provider: 'google', model: 'gemini-2.5-pro' },
  's4': { id: 's4', name: 'Documentation update', workspace: 'notecode', status: 'archived', duration: '30m', lastActive: 'Yesterday', taskId: '4', project: 'notecode', agent: 'researcher', provider: 'anthropic', model: 'claude-sonnet' },
  's5': { id: 's5', name: 'Research best practices', workspace: 'ai-dashboard', status: 'not-started', duration: '0m', lastActive: '3 days ago', taskId: '5', project: 'ai-dashboard', agent: 'researcher', provider: 'google', model: 'gemini-3-pro' },
};

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
