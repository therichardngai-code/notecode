import { create } from 'zustand';

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  // Floating Panels
  isNewTaskPanelOpen: boolean;
  isSettingsPanelOpen: boolean;
  openNewTaskPanel: () => void;
  closeNewTaskPanel: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;

  // Task Detail Panel
  selectedTaskId: string | null;
  isTaskDetailPanelOpen: boolean;
  openTaskDetailPanel: (taskId: string) => void;
  closeTaskDetailPanel: () => void;

  // Task Tab (Full View) - opens task as a tab block
  pendingTaskTab: { taskId: string; title: string } | null;
  openTaskAsTab: (taskId: string, title: string) => void;
  clearPendingTaskTab: () => void;

  // Modals
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),

  leftPanelOpen: true,
  rightPanelOpen: false,
  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  // Floating Panels
  isNewTaskPanelOpen: false,
  isSettingsPanelOpen: false,
  openNewTaskPanel: () => set({ isNewTaskPanelOpen: true }),
  closeNewTaskPanel: () => set({ isNewTaskPanelOpen: false }),
  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),

  // Task Detail Panel
  selectedTaskId: null,
  isTaskDetailPanelOpen: false,
  openTaskDetailPanel: (taskId) => set({ selectedTaskId: taskId, isTaskDetailPanelOpen: true }),
  closeTaskDetailPanel: () => set({ selectedTaskId: null, isTaskDetailPanelOpen: false }),

  // Task Tab (Full View)
  pendingTaskTab: null,
  openTaskAsTab: (taskId, title) => set({ pendingTaskTab: { taskId, title }, isTaskDetailPanelOpen: false }),
  clearPendingTaskTab: () => set({ pendingTaskTab: null }),

  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
