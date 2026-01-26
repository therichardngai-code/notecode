import { useState, useCallback, useMemo } from 'react';
import type { Task, TaskStatus, TaskPriority, AgentType } from '../../../domain/entities';

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  agentRole?: AgentType[];
  projectId?: string[];
  assignee?: string[];
  searchQuery?: string;
}

interface UseTaskFiltersReturn {
  filters: TaskFilters;
  setFilters: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  filterTasks: (tasks: Task[]) => Task[];
  hasActiveFilters: boolean;
}

export function useTaskFilters(): UseTaskFiltersReturn {
  const [filters, setFiltersState] = useState<TaskFilters>({});

  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some((key) => {
      const value = filters[key as keyof TaskFilters];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== '';
    });
  }, [filters]);

  const filterTasks = useCallback(
    (tasks: Task[]): Task[] => {
      return tasks.filter((task) => {
        if (filters.status && filters.status.length > 0) {
          if (!filters.status.includes(task.status)) {
            return false;
          }
        }

        if (filters.priority && filters.priority.length > 0) {
          if (!filters.priority.includes(task.priority)) {
            return false;
          }
        }

        if (filters.agentRole && filters.agentRole.length > 0) {
          if (!filters.agentRole.includes(task.agentRole)) {
            return false;
          }
        }

        if (filters.projectId && filters.projectId.length > 0) {
          if (!filters.projectId.includes(task.projectId)) {
            return false;
          }
        }

        if (filters.assignee && filters.assignee.length > 0) {
          if (!task.assignee || !filters.assignee.includes(task.assignee)) {
            return false;
          }
        }

        if (filters.searchQuery && filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(query);
          const matchesDescription = task.description.toLowerCase().includes(query);
          if (!matchesTitle && !matchesDescription) {
            return false;
          }
        }

        return true;
      });
    },
    [filters]
  );

  return {
    filters,
    setFilters,
    clearFilters,
    filterTasks,
    hasActiveFilters,
  };
}
