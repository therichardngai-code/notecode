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

  // Active Project (for context in panels)
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;

  // Floating Panels
  isNewTaskPanelOpen: boolean;
  isSettingsPanelOpen: boolean;
  openNewTaskPanel: (projectId?: string) => void;
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

  // File Preview Tab - opens file content as a tab
  pendingFileTab: { path: string; content: string } | null;
  openFileAsTab: (path: string, content: string) => void;
  clearPendingFileTab: () => void;

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

  // Active Project
  activeProjectId: null,
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),

  // Floating Panels
  isNewTaskPanelOpen: false,
  isSettingsPanelOpen: false,
  openNewTaskPanel: (projectId) => set((state) => ({
    isNewTaskPanelOpen: true,
    activeProjectId: projectId ?? state.activeProjectId,
  })),
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

  // File Preview Tab
  pendingFileTab: null,
  openFileAsTab: (path, content) => set({ pendingFileTab: { path, content } }),
  clearPendingFileTab: () => set({ pendingFileTab: null }),

  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
