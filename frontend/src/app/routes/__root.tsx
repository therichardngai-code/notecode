import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  AppShell,
  Navigator,
  TopTabs,
  StatusBar,
  FloatingChatPanel,
  FloatingSettingsPanel,
  FloatingNewTaskPanel,
  TogglePanel,
} from '@/shared/components/layout';
import { FloatingTaskDetailPanel } from '@/shared/components/floating/FloatingTaskDetailPanel';
import { useTabManager, usePanelState, useFloatingPanels } from '@/shared/hooks';
import { useUIStore } from '@/shared/stores';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Task detail panel state from store - use atomic selectors for proper Zustand subscription
  const isTaskDetailPanelOpen = useUIStore((state) => state.isTaskDetailPanelOpen);
  const selectedTaskId = useUIStore((state) => state.selectedTaskId);
  const closeTaskDetailPanel = useUIStore((state) => state.closeTaskDetailPanel);
  const pendingTaskTab = useUIStore((state) => state.pendingTaskTab);
  const clearPendingTaskTab = useUIStore((state) => state.clearPendingTaskTab);

  // Tab management hook
  const {
    tabs,
    activeTabId,
    routeTabConfig,
    handleTabClick,
    handleTabClose,
    handleAddTab,
    handleOpenInNewTab,
    handleFileClick,
    handleOpenFileInNewTab,
    handleOpenTaskAsTab,
    setTabs,
  } = useTabManager();

  // Handle pending task tab (Full View feature)
  useEffect(() => {
    if (pendingTaskTab) {
      handleOpenTaskAsTab(pendingTaskTab.taskId, pendingTaskTab.title);
      clearPendingTaskTab();
    }
  }, [pendingTaskTab, handleOpenTaskAsTab, clearPendingTaskTab]);

  // Panel state hook
  const {
    activePanelType,
    activePanelRoute,
    showPanel,
    handlePanelClose,
    handlePanelItemClick,
    handlePanelItemDoubleClick,
  } = usePanelState({ routeTabConfig, activeTabId, setTabs });

  // Floating panels hook
  const {
    isSettingsPanelOpen,
    setIsSettingsPanelOpen,
    handleSettingsClick,
    handleGoToFullChat,
    handleOpenFullSettings,
    handleOpenFullTask,
    handleCreateTask,
    handleAutoStartTask,
    openNewTaskPanel,
  } = useFloatingPanels();

  return (
    <AppShell>
      <div className="flex-1 flex overflow-hidden">
        <Navigator
          isCollapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
          onOpenInNewTab={handleOpenInNewTab}
          onSettingsClick={handleSettingsClick}
          onNewTaskClick={openNewTaskPanel}
          onPanelItemClick={handlePanelItemClick}
          onPanelItemDoubleClick={handlePanelItemDoubleClick}
          activePanelRoute={activePanelRoute}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopTabs tabs={tabs} activeTabId={activeTabId} onTabClick={handleTabClick} onTabClose={handleTabClose} onAddTab={handleAddTab} />

          <div className="flex-1 flex overflow-hidden">
            {/* Toggle Panel */}
            <div
              className={`border-r border-border/50 flex flex-col glass-subtle shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
                showPanel ? 'w-64 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              {activePanelType && (
                <TogglePanel
                  activePanel={activePanelType}
                  onClose={handlePanelClose}
                  onFileClick={handleFileClick}
                  onOpenFileInNewTab={handleOpenFileInNewTab}
                />
              )}
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <StatusBar onSettingsClick={() => setIsSettingsPanelOpen(true)} onNewTaskClick={openNewTaskPanel} />

      {/* Floating Panels */}
      <FloatingChatPanel onGoToFullChat={handleGoToFullChat} />
      <FloatingSettingsPanel isOpen={isSettingsPanelOpen} onClose={() => setIsSettingsPanelOpen(false)} onOpenFullSettings={handleOpenFullSettings} />
      <FloatingNewTaskPanel onCreateTask={handleCreateTask} onAutoStart={handleAutoStartTask} onOpenFullTask={handleOpenFullTask} />
      <FloatingTaskDetailPanel isOpen={isTaskDetailPanelOpen} taskId={selectedTaskId} onClose={closeTaskDetailPanel} />
    </AppShell>
  );
}
