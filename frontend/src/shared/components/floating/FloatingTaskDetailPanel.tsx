import { useRef, useEffect, useState, useCallback, useMemo, startTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  X, ChevronsRight, Folder, Bot, Zap,
  ExternalLink, GripVertical, FileCode, Loader2, Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  propertyTypes, statusPropertyType,
  agentLabels, providerLabels, modelLabels,
} from '@/shared/config/property-config';
// Phase 4 Hooks
import {
  useTaskDetail, useSessions, useTaskMessages, useSessionDiffs,
  useTaskWebSocket, useRealtimeState,
  useMessageConversion, useFilteredSessionIds, useTaskUIState,
  useScrollRestoration, useApprovalState, useApprovalHandlers,
  useSessionStartHandler,
  type TaskDetailProperty,
} from '@/shared/hooks';
import type { TaskStatus } from '@/adapters/api/tasks-api';
// Shared types
import type { ChatMessage } from '@/shared/types';
// Phase 5 Tabs
import { ActivityTab, AISessionTab, DiffsTab, SessionsTab } from '@/shared/components/task-detail/tabs';
// Phase 6 + Shared Components
import {
  ChatInputFooter, type ChatInputFooterHandle, TaskInfoTabsNav,
  TaskEditPanel, ContentPreviewModal, ContextWarningDialog,
} from '@/shared/components/task-detail';
import { useContextWarning } from '@/shared/hooks/use-context-warning';
import { useUIStore } from '@/shared/stores';

interface FloatingTaskDetailPanelProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
}

// Combined property types for Task Detail (includes status)
const taskDetailPropertyTypes = [statusPropertyType, ...propertyTypes];

export function FloatingTaskDetailPanel({ isOpen, taskId, onClose }: FloatingTaskDetailPanelProps) {
  const navigate = useNavigate();
  const openFileAsTab = useUIStore((s) => s.openFileAsTab);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  // Shared hook - single source of truth (API only)
  const {
    task,
    projectName,
    displayProperties,
    isLoading,
    isUpdating,
    isEditing,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editProperties,
    startEdit,
    cancelEdit,
    saveEdit,
    updateProperty,
    addProperty,
    removeProperty,
    updateStatus,
  } = useTaskDetail({ taskId: taskId || '' });

  // Fetch sessions for this task - backend returns sorted by createdAt DESC (latest first)
  const { data: sessions = [] } = useSessions({ taskId: taskId || '' });
  const latestSession = sessions[0];

  // Context window warning hook
  const { showWarning, dismissWarning } = useContextWarning(latestSession);


  // Track just-started session for immediate WebSocket connection (before query refetch)
  const [justStartedSession, setJustStartedSession] = useState<{ id: string; status: string } | null>(null);

  // Derive active session: use query data once it catches up, otherwise use optimistic
  const activeSession = useMemo(() => {
    if (justStartedSession && latestSession?.id === justStartedSession.id) {
      return latestSession;
    }
    return justStartedSession || latestSession;
  }, [justStartedSession, latestSession]);

  const activeSessionId = activeSession?.id || '';

  // Session chain filter for Renew mode (extracted hook)
  const filterSessionIds = useFilteredSessionIds({ latestSession, sessions });

  // Fetch messages and diffs
  const { data: apiMessages = [] } = useTaskMessages(taskId, 200, filterSessionIds);
  const { data: apiDiffs = [] } = useSessionDiffs(activeSessionId);

  // Convert API data to UI format (extracted hook)
  const { chatMessages, sessionDiffs } = useMessageConversion({ apiMessages, apiDiffs });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  // Keep chatMessagesRef in sync for WebSocket callback dedup
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Approval state hook
  const {
    pendingApprovals,
    setPendingApprovals,
    processingApproval,
    setProcessingApproval,
    gitCommitApprovals,
  } = useApprovalState({ activeSessionId, taskId: taskId || '' });

  // UI state hook
  const {
    isDescriptionExpanded, setIsDescriptionExpanded,
    activeInfoTab, setActiveInfoTab,
    isTyping, setIsTyping,
    diffApprovals, setDiffApprovals,
    showAddProperty, setShowAddProperty,
    expandedCommands, setExpandedCommands,
    setSelectedDiffFile,
    setSubPanelTab,
    setIsSubPanelOpen,
    contentModalData, setContentModalData,
  } = useTaskUIState();

  // Realtime state hook
  const {
    realtimeMessages,
    setRealtimeMessages,
    currentAssistantMessage,
    setCurrentAssistantMessage,
    currentToolUse,
    setCurrentToolUse,
    setStreamingToolUses,
    isWaitingForResponse,
    setIsWaitingForResponse,
    wsSessionStatus,
    setWsSessionStatus,
    setMessageBuffers,
    streamingBufferRef,
    processedMessageIds,
  } = useRealtimeState();

  // Refs
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const chatInputFooterRef = useRef<ChatInputFooterHandle>(null);
  const aiSessionContainerRef = useRef<HTMLDivElement>(null);
  const messageCounterRef = useRef(0);

  // Scroll restoration hook
  const {
    isScrolledUpFromBottom,
    resetScrollState,
    handleScroll,
    saveScrollPosition,
  } = useScrollRestoration({
    containerRef: aiSessionContainerRef,
    chatMessages,
    currentAssistantMessage,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET
  // ═══════════════════════════════════════════════════════════════════════════

  // Check if session is running
  const terminalStates = ['completed', 'failed', 'cancelled'];
  const isSessionLive = activeSession &&
    !terminalStates.includes(activeSession.status) &&
    (wsSessionStatus === null || !terminalStates.includes(wsSessionStatus));

  // WebSocket connection for real-time chat
  const { isConnected: isWsConnected, sendUserInput, sendCancel, sendApprovalResponse } = useTaskWebSocket({
    sessionId: activeSessionId,
    isSessionLive,
    chatMessagesRef,
    streamingBufferRef,
    processedMessageIds,
    setRealtimeMessages,
    setCurrentAssistantMessage,
    setCurrentToolUse,
    setStreamingToolUses,
    setIsWaitingForResponse,
    setWsSessionStatus,
    setPendingApprovals,
    setMessageBuffers,
  });

  // Approval handlers hook
  const { handleApproveRequest, handleRejectRequest } = useApprovalHandlers({
    isWsConnected,
    isSessionLive,
    sendApprovalResponse,
    setPendingApprovals,
    setProcessingApproval,
  });

  // Session start handler hook (shared with tasks.$taskId.tsx)
  const { handleStartSessionWithMode, isStartingSession } = useSessionStartHandler({
    taskId,
    chatInputFooterRef,
    aiSessionContainerRef,
    streamingBufferRef,
    processedMessageIds,
    messageCounterRef,
    setRealtimeMessages,
    setCurrentAssistantMessage,
    setStreamingToolUses,
    setMessageBuffers,
    setWsSessionStatus,
    setJustStartedSession,
    setIsWaitingForResponse,
    setActiveInfoTab,
    resetScrollState,
    saveScrollPosition,
    activeInfoTab,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Tab change handler with startTransition
  const handleTabChange = useCallback((tab: 'activity' | 'ai-session' | 'diffs' | 'sessions') => {
    startTransition(() => setActiveInfoTab(tab));
  }, [setActiveInfoTab]);


  // Task action handlers
  const handleStartTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };
  const handleCancelTask = () => updateStatus('cancelled' as TaskStatus);
  const handleContinueTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };

  // File details handlers
  const handleDiffFileClick = (fileId: string) => {
    setSelectedDiffFile(fileId);
    setSubPanelTab('diffs');
    setIsSubPanelOpen(true);
  };
  const handleApproveDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'approved' }));
  const handleRejectDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'rejected' }));

  const toggleCommand = (key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Full View handler
  const handleFullView = () => {
    if (taskId && task) {
      navigate({ to: '/tasks/$taskId', params: { taskId } });
      onClose();
    }
  };

  // Property display helpers
  const getPropertyIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      project: Folder, agent: Bot, provider: Zap, model: Zap,
      priority: Zap, skills: Zap, tools: Wrench, context: FileCode,
    };
    return icons[type] || FileCode;
  };

  const getPropertyDisplayValue = (prop: TaskDetailProperty): string | undefined => {
    if (prop.value.length === 0) return undefined;
    const value = prop.value[0];
    switch (prop.type) {
      case 'agent': return agentLabels[value] || value;
      case 'provider': return providerLabels[value] || value;
      case 'model': return modelLabels[value] || value;
      case 'skills': return prop.value.join(', ');
      case 'tools': return prop.value.includes('all') ? 'All Tools' : prop.value.join(', ');
      case 'context': return `${prop.value.length} file(s)`;
      default: return value;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addPropertyRef.current && !addPropertyRef.current.contains(e.target as Node)) {
        setShowAddProperty(false);
      }
    };
    if (showAddProperty) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddProperty, setShowAddProperty]);

  // Close edit mode on click outside
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (editFormRef.current && !editFormRef.current.contains(e.target as Node)) {
        cancelEdit();
        setShowAddProperty(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, cancelEdit, setShowAddProperty]);

  // Panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 360), 800);
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden",
          "bg-background border-l border-border shadow-2xl",
          "transition-[width] duration-300 ease-out",
          isResizing && "select-none transition-none"
        )}
        style={{ width: panelWidth }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors z-10"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
              title="Close panel"
            >
              <ChevronsRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground truncate">
              {task?.title || 'Task Details'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleFullView}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Open full view"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading task...
          </div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Task not found
          </div>
        ) : (
          <>
            {/* Use simple overflow div instead of ScrollArea for proper resize propagation */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4">
                {/* Task Edit Panel */}
                <TaskEditPanel
                  isEditing={isEditing}
                  task={task}
                  projectName={projectName}
                  displayProperties={displayProperties}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  editProperties={editProperties}
                  showAddProperty={showAddProperty}
                  isDescriptionExpanded={isDescriptionExpanded}
                  isUpdating={isUpdating}
                  editFormRef={editFormRef}
                  addPropertyRef={addPropertyRef}
                  taskDetailPropertyTypes={taskDetailPropertyTypes}
                  onSetEditTitle={setEditTitle}
                  onSetEditDescription={setEditDescription}
                  onSetShowAddProperty={setShowAddProperty}
                  onSetIsDescriptionExpanded={setIsDescriptionExpanded}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onAddProperty={addProperty}
                  onRemoveProperty={removeProperty}
                  onUpdateProperty={updateProperty}
                  getPropertyIcon={getPropertyIcon}
                  getPropertyDisplayValue={getPropertyDisplayValue}
                />

                <div className="border-t border-border my-4" />

                {/* Tabbed Info Panel */}
                <div className="w-full overflow-hidden">
                  <TaskInfoTabsNav
                    activeTab={activeInfoTab}
                    latestSession={latestSession}
                    sessionsCount={sessions.length}
                    onTabChange={handleTabChange}
                    onExpandToSubPanel={() => {
                      setSubPanelTab('chat-session');
                      setIsSubPanelOpen(true);
                    }}
                  />

                  {/* Activity Tab */}
                  {activeInfoTab === 'activity' && (
                    <ActivityTab
                      task={task}
                      sessions={sessions}
                      gitCommitApprovals={gitCommitApprovals}
                    />
                  )}

                  {/* AI Session Tab */}
                  {activeInfoTab === 'ai-session' && (
                    <AISessionTab
                      chatMessages={chatMessages}
                      realtimeMessages={realtimeMessages}
                      currentAssistantMessage={currentAssistantMessage}
                      currentToolUse={currentToolUse}
                      expandedCommands={expandedCommands}
                      latestSession={latestSession}
                      isStartingSession={isStartingSession}
                      isWaitingForResponse={isWaitingForResponse}
                      isTyping={isTyping}
                      isWsConnected={isWsConnected}
                      isSessionLive={isSessionLive}
                      pendingApprovals={pendingApprovals}
                      processingApproval={processingApproval}
                      aiSessionContainerRef={aiSessionContainerRef}
                      isScrolledUpFromBottom={isScrolledUpFromBottom}
                      onHandleScroll={handleScroll}
                      onApproveRequest={handleApproveRequest}
                      onRejectRequest={handleRejectRequest}
                      onToggleCommand={toggleCommand}
                      onSetContentModal={setContentModalData}
                      onOpenFileAsTab={openFileAsTab}
                    />
                  )}

                  {/* Diffs Tab */}
                  {activeInfoTab === 'diffs' && (
                    <DiffsTab
                      latestSession={latestSession}
                      sessionDiffs={sessionDiffs}
                      diffApprovals={diffApprovals}
                      onDiffFileClick={handleDiffFileClick}
                      onApproveDiff={handleApproveDiff}
                      onRejectDiff={handleRejectDiff}
                    />
                  )}

                  {/* Sessions Tab */}
                  {activeInfoTab === 'sessions' && (
                    <SessionsTab
                      task={task}
                      sessions={sessions}
                      latestSession={latestSession}
                      isStartingSession={isStartingSession}
                      onStartSessionWithMode={handleStartSessionWithMode}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input Footer */}
            <ChatInputFooter
              ref={chatInputFooterRef}
              latestSession={latestSession}
              isSessionLive={isSessionLive}
              isWsConnected={isWsConnected}
              task={task}
              isStartingSession={isStartingSession}
              isUpdating={isUpdating}
              realtimeMessages={realtimeMessages}
              setRealtimeMessages={setRealtimeMessages}
              currentAssistantMessage={currentAssistantMessage}
              setCurrentAssistantMessage={setCurrentAssistantMessage}
              isWaitingForResponse={isWaitingForResponse}
              setIsWaitingForResponse={setIsWaitingForResponse}
              isTyping={isTyping}
              setIsTyping={setIsTyping}
              sendUserInput={sendUserInput}
              sendCancel={sendCancel}
              onStartTask={handleStartTask}
              onStartSessionWithMode={handleStartSessionWithMode}
              onCancelTask={handleCancelTask}
              onContinueTask={handleContinueTask}
            />
          </>
        )}

        {/* Content Modal */}
        <ContentPreviewModal
          isOpen={!!contentModalData}
          filePath={contentModalData?.filePath || ''}
          content={contentModalData?.content || ''}
          onClose={() => setContentModalData(null)}
        />

        {/* Context Window Warning Dialog */}
        <ContextWarningDialog
          open={showWarning}
          contextWindow={latestSession?.contextWindow}
          onClose={dismissWarning}
          onRenew={() => {
            dismissWarning();
            handleStartSessionWithMode('renew');
          }}
        />
      </div>
    </>
  );
}
