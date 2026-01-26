import { useState, useCallback } from 'react';
import type { Task, TaskStatus } from '../../../domain/entities';

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
  refreshTasks: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
      setIsLoading(true);
      setError(null);

      try {
        const newTask: Task = {
          ...taskData,
          id: `task-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>): Promise<Task> => {
      setIsLoading(true);
      setError(null);

      try {
        const taskIndex = tasks.findIndex((t) => t.id === id);
        if (taskIndex === -1) {
          throw new Error('Task not found');
        }

        const updatedTask: Task = {
          ...tasks[taskIndex],
          ...updates,
          updatedAt: new Date(),
        };

        setTasks((prev) => {
          const newTasks = [...prev];
          newTasks[taskIndex] = updatedTask;
          return newTasks;
        });

        return updatedTask;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [tasks]
  );

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskById = useCallback(
    (id: string): Task | undefined => {
      return tasks.find((t) => t.id === id);
    },
    [tasks]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      return tasks.filter((t) => t.status === status);
    },
    [tasks]
  );

  const refreshTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Placeholder for API call
      // const response = await fetch('/api/tasks');
      // const data = await response.json();
      // setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh tasks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByStatus,
    refreshTasks,
  };
}
