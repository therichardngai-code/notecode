import { create } from 'zustand';

interface SelectionState {
  // Selected items
  selectedTaskIds: Set<string>;
  selectedSessionIds: Set<string>;
  selectedAgentIds: Set<string>;

  // Task selection
  selectTask: (id: string) => void;
  deselectTask: (id: string) => void;
  toggleTask: (id: string) => void;
  clearTaskSelection: () => void;
  selectAllTasks: (ids: string[]) => void;

  // Session selection
  selectSession: (id: string) => void;
  deselectSession: (id: string) => void;
  toggleSession: (id: string) => void;
  clearSessionSelection: () => void;

  // Agent selection
  selectAgent: (id: string) => void;
  deselectAgent: (id: string) => void;
  toggleAgent: (id: string) => void;
  clearAgentSelection: () => void;

  // Clear all
  clearAllSelections: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedTaskIds: new Set(),
  selectedSessionIds: new Set(),
  selectedAgentIds: new Set(),

  // Task selection
  selectTask: (id) =>
    set((state) => ({
      selectedTaskIds: new Set(state.selectedTaskIds).add(id),
    })),
  deselectTask: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedTaskIds);
      newSet.delete(id);
      return { selectedTaskIds: newSet };
    }),
  toggleTask: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedTaskIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedTaskIds: newSet };
    }),
  clearTaskSelection: () => set({ selectedTaskIds: new Set() }),
  selectAllTasks: (ids) => set({ selectedTaskIds: new Set(ids) }),

  // Session selection
  selectSession: (id) =>
    set((state) => ({
      selectedSessionIds: new Set(state.selectedSessionIds).add(id),
    })),
  deselectSession: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedSessionIds);
      newSet.delete(id);
      return { selectedSessionIds: newSet };
    }),
  toggleSession: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedSessionIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedSessionIds: newSet };
    }),
  clearSessionSelection: () => set({ selectedSessionIds: new Set() }),

  // Agent selection
  selectAgent: (id) =>
    set((state) => ({
      selectedAgentIds: new Set(state.selectedAgentIds).add(id),
    })),
  deselectAgent: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedAgentIds);
      newSet.delete(id);
      return { selectedAgentIds: newSet };
    }),
  toggleAgent: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedAgentIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedAgentIds: newSet };
    }),
  clearAgentSelection: () => set({ selectedAgentIds: new Set() }),

  // Clear all
  clearAllSelections: () =>
    set({
      selectedTaskIds: new Set(),
      selectedSessionIds: new Set(),
      selectedAgentIds: new Set(),
    }),
}));
