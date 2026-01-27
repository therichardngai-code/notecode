import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/shared/stores';
import { useTaskCreation } from './use-task-creation';
import type { TaskData } from '@/shared/components/layout';

export function useFloatingPanels() {
  const navigate = useNavigate();
  const { isSettingsPanelOpen, openSettingsPanel, closeSettingsPanel, openNewTaskPanel, closeNewTaskPanel } = useUIStore();
  const { createTask } = useTaskCreation();

  const handleSettingsClick = useCallback(() => {
    if (isSettingsPanelOpen) {
      closeSettingsPanel();
    } else {
      openSettingsPanel();
    }
  }, [isSettingsPanelOpen, closeSettingsPanel, openSettingsPanel]);

  const handleGoToFullChat = useCallback(
    (_chatId?: string) => {
      navigate({ to: '/chat' });
    },
    [navigate]
  );

  const handleOpenFullSettings = useCallback(() => {
    closeSettingsPanel();
    navigate({ to: '/settings' });
  }, [navigate, closeSettingsPanel]);

  const handleOpenFullTask = useCallback(() => {
    closeNewTaskPanel();
    navigate({ to: '/tasks/new' });
  }, [navigate, closeNewTaskPanel]);

  const handleCreateTask = useCallback(
    async (task: TaskData) => {
      await createTask({ ...task, requirement: task.requirement }, { navigateTo: '/tasks' });
    },
    [createTask]
  );

  const handleAutoStartTask = useCallback(
    async (task: TaskData) => {
      await createTask({ ...task, requirement: task.requirement }, { navigateTo: '/sessions', autoStart: true });
    },
    [createTask]
  );

  return {
    isSettingsPanelOpen,
    setIsSettingsPanelOpen: (open: boolean) => (open ? openSettingsPanel() : closeSettingsPanel()),
    handleSettingsClick,
    handleGoToFullChat,
    handleOpenFullSettings,
    handleOpenFullTask,
    handleCreateTask,
    handleAutoStartTask,
    openNewTaskPanel,
  };
}
