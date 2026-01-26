import { create } from 'zustand';
import type { TaskStatus, TaskPriority } from '../../domain/entities';

interface FilterState {
  // Task filters
  statusFilter: TaskStatus | 'all';
  priorityFilter: TaskPriority | 'all';
  projectFilter: string | 'all';
  agentFilter: string | 'all';
  searchQuery: string;

  // Actions
  setStatusFilter: (status: TaskStatus | 'all') => void;
  setPriorityFilter: (priority: TaskPriority | 'all') => void;
  setProjectFilter: (projectId: string | 'all') => void;
  setAgentFilter: (agentId: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  statusFilter: 'all',
  priorityFilter: 'all',
  projectFilter: 'all',
  agentFilter: 'all',
  searchQuery: '',

  setStatusFilter: (status) => set({ statusFilter: status }),
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
  setProjectFilter: (projectId) => set({ projectFilter: projectId }),
  setAgentFilter: (agentId) => set({ agentFilter: agentId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () =>
    set({
      statusFilter: 'all',
      priorityFilter: 'all',
      projectFilter: 'all',
      agentFilter: 'all',
      searchQuery: '',
    }),
}));
