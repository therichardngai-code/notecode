import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/shared/stores';
import type { TaskData } from '@/shared/components/layout';

export function useFloatingPanels() {
  const navigate = useNavigate();
  const { isSettingsPanelOpen, openSettingsPanel, closeSettingsPanel, openNewTaskPanel, closeNewTaskPanel } = useUIStore();

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
    navigate({ to: '/tasks' });
  }, [navigate, closeNewTaskPanel]);

  const handleCreateTask = useCallback(
    (task: TaskData) => {
      console.log('Task created:', task);
      navigate({ to: '/tasks' });
    },
    [navigate]
  );

  const handleAutoStartTask = useCallback(
    (task: TaskData) => {
      console.log('Task auto-started:', task);
      navigate({ to: '/sessions' });
    },
    [navigate]
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
