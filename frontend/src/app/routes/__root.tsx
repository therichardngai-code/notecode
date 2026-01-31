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
import { useTabManager, usePanelState, useFloatingPanels, useSettings } from '@/shared/hooks';
import { useUIStore } from '@/shared/stores';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { detectLanguage, getLanguageDisplayName } from '@/features/explorer/utils/language-detector';
import { ExternalLink } from 'lucide-react';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Get active project ID from settings
  const { data: settings } = useSettings();
  const activeProjectId = settings?.currentActiveProjectId;

  // Task detail panel state from store - use atomic selectors for proper Zustand subscription
  const isTaskDetailPanelOpen = useUIStore((state) => state.isTaskDetailPanelOpen);
  const selectedTaskId = useUIStore((state) => state.selectedTaskId);
  const closeTaskDetailPanel = useUIStore((state) => state.closeTaskDetailPanel);
  const pendingTaskTab = useUIStore((state) => state.pendingTaskTab);
  const clearPendingTaskTab = useUIStore((state) => state.clearPendingTaskTab);
  const pendingFileTab = useUIStore((state) => state.pendingFileTab);
  const clearPendingFileTab = useUIStore((state) => state.clearPendingFileTab);

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
    handleOpenFileContentAsTab,
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

  // Handle pending file tab (File Preview feature)
  useEffect(() => {
    if (pendingFileTab) {
      handleOpenFileContentAsTab(pendingFileTab.path, pendingFileTab.content);
      clearPendingFileTab();
    }
  }, [pendingFileTab, handleOpenFileContentAsTab, clearPendingFileTab]);

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

  // Handle opening file in external editor (VS Code)
  const handleOpenInExternalEditor = async (filePath: string | undefined) => {
    if (!filePath || !activeProjectId) return;

    try {
      const response = await fetch('/api/files/open-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          filePath
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to open file:', error.error);
      }
    } catch (error) {
      console.error('Failed to open file in editor:', error);
    }
  };

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
                  projectId={activeProjectId}
                />
              )}
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {(() => {
                const activeTab = tabs.find((t) => t.id === activeTabId);
                if (activeTab?.fileContent) {
                  return (
                    <div className="h-full flex flex-col bg-[#1e1e1e]">
                      {/* Header with file path + Open in Editor button */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d2d2d] bg-[#252526]">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-mono text-[#cccccc] truncate">
                            {activeTab.filePath}
                          </span>
                          <span className="text-xs text-[#858585]">
                            {getLanguageDisplayName(detectLanguage(activeTab.filePath || ''))}
                          </span>
                        </div>

                        {/* Open in Editor button */}
                        <button
                          onClick={() => handleOpenInExternalEditor(activeTab.filePath)}
                          className="ml-2 px-3 py-1.5 text-xs rounded bg-[#0e639c] hover:bg-[#1177bb] text-white flex items-center gap-1.5 transition-colors"
                          title="Open in VS Code (Ctrl+O)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in Editor
                        </button>
                      </div>

                      {/* VS Code-style syntax highlighted content */}
                      <div className="flex-1 overflow-auto">
                        <SyntaxHighlighter
                          language={detectLanguage(activeTab.filePath || '')}
                          style={vscDarkPlus}
                          showLineNumbers={true}
                          wrapLines={true}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '14px',
                            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
                            background: '#1e1e1e',
                            height: '100%',
                          }}
                          lineNumberStyle={{
                            minWidth: '3.5em',
                            paddingRight: '1em',
                            color: '#858585',
                            userSelect: 'none',
                            borderRight: '1px solid #2d2d2d',
                            marginRight: '1em',
                          }}
                        >
                          {activeTab.fileContent}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  );
                }
                return <Outlet />;
              })()}
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
