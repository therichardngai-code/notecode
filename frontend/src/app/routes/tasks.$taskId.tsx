import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Folder, Bot, Sparkles, Zap,
  FileCode, Loader2, Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTaskDetail, useSessions, useTaskMessages, useSessionDiffs, useTaskWebSocket, useRealtimeState, useMessageConversion, useFilteredSessionIds, useTaskUIState, useScrollRestoration, useApprovalState, useApprovalHandlers, useSessionStartHandler, type TaskDetailProperty } from '@/shared/hooks';
import { propertyTypes, statusPropertyType, agentLabels, providerLabels, modelLabels } from '@/shared/config/property-config';
import type { TaskStatus } from '@/adapters/api/tasks-api';
// Shared types and utilities
import type { ChatMessage } from '@/shared/types';
// Shared task-detail components
import {
  ContextWarningDialog, ChatInputFooter, type ChatInputFooterHandle, ContentPreviewModal, TaskInfoTabsNav,
  FileDetailsPanel, TaskEditPanel, GitInitDialog,
} from '@/shared/components/task-detail';
import { projectsApi } from '@/adapters/api/projects-api';
import type { SessionResumeMode } from '@/adapters/api/sessions-api';
// Phase 5 Tabs
import { ActivityTab, AISessionTab, DiffsTab, SessionsTab } from '@/shared/components/task-detail/tabs';
import { useContextWarning } from '@/shared/hooks/use-context-warning';
import { useUIStore } from '@/shared/stores';

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskDetailPage,
});

// Combined property types for Task Detail (includes status)
const taskDetailPropertyTypes = [statusPropertyType, ...propertyTypes];

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const openFileAsTab = useUIStore((s) => s.openFileAsTab);

  // Shared hook - single source of truth (API only)
  const {
    task,
    projectName,
    displayProperties,
    isLoading,
    error,
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
  } = useTaskDetail({ taskId });

  // Fetch sessions for this task - backend returns sorted by createdAt DESC (latest first)
  const { data: sessions = [] } = useSessions({ taskId });
  const latestSession = sessions[0];

  // Context window warning hook
  const { showWarning, dismissWarning } = useContextWarning(latestSession);

  // Git init dialog state
  const [gitInitDialogOpen, setGitInitDialogOpen] = useState(false);
  const [pendingGitInitMode, setPendingGitInitMode] = useState<SessionResumeMode | null>(null);
  const [pendingGitInitPrompt, setPendingGitInitPrompt] = useState<string | undefined>();
  const [isInitializingGit, setIsInitializingGit] = useState(false);

  // Track just-started session for immediate WebSocket connection (before query refetch)
  const [justStartedSession, setJustStartedSession] = useState<{ id: string; status: string } | null>(null);

  // Derive active session: use query data once it catches up, otherwise use optimistic
  const activeSession = useMemo(() => {
    // Query caught up - use real session data
    if (justStartedSession && latestSession?.id === justStartedSession.id) {
      return latestSession;
    }
    // Use optimistic just-started OR fallback to latest
    return justStartedSession || latestSession;
  }, [justStartedSession, latestSession]);

  const activeSessionId = activeSession?.id || '';

  // Track providerSessionId to maintain stable query during Resume
  // Determine session chain filter for Renew mode
  // If there's a Renew in the chain, only show messages from Renew onwards
  // CRITICAL: Keep filter stable during Resume (same providerSessionId) to prevent scroll jump
  const filterSessionIds = useFilteredSessionIds({ latestSession, sessions });

  // Fetch all messages for task (across all sessions) and diffs from active session
  // In Renew mode, only show messages from Renew session chain. In Retry/Resume, show all cumulative.
  const { data: apiMessages = [] } = useTaskMessages(taskId, 200, filterSessionIds);
  const { data: apiDiffs = [] } = useSessionDiffs(activeSessionId);

  // Convert API data to UI format
  const { chatMessages, sessionDiffs } = useMessageConversion({ apiMessages, apiDiffs });

  // Keep chatMessagesRef in sync for WebSocket callback dedup (avoids stale closure)
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Approval state hook (provides setPendingApprovals to WebSocket)
  const {
    pendingApprovals,
    setPendingApprovals,
    processingApproval,
    setProcessingApproval,
    gitCommitApprovals,
  } = useApprovalState({ activeSessionId, taskId });

  // UI state hook (chat state moved to ChatInputFooter for performance)
  const {
    isDescriptionExpanded, setIsDescriptionExpanded,
    activeInfoTab, setActiveInfoTab,
    isTyping, setIsTyping,
    diffApprovals, setDiffApprovals,
    showAddProperty, setShowAddProperty,
    expandedCommands, setExpandedCommands,
    selectedDiffFile, setSelectedDiffFile,
    subPanelTab, setSubPanelTab,
    isSubPanelOpen, setIsSubPanelOpen,
    contentModalData, setContentModalData,
  } = useTaskUIState();

  const addPropertyRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const chatInputFooterRef = useRef<ChatInputFooterHandle>(null);

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

  // Scroll container refs
  const aiSessionContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
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

  // Git init dialog callback (passed to useSessionStartHandler)
  const handleGitInitRequired = useCallback((mode: SessionResumeMode, prompt?: string) => {
    setPendingGitInitMode(mode);
    setPendingGitInitPrompt(prompt);
    setGitInitDialogOpen(true);
  }, []);

  // Session start handler hook (shared with FloatingTaskDetailPanel)
  // NOTE: Must be defined before handleGitInitConfirm which uses handleStartSessionWithMode
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
    onGitInitRequired: handleGitInitRequired,
  });

  // Git init dialog confirm/cancel handlers (must be after useSessionStartHandler)
  const handleGitInitConfirm = useCallback(async () => {
    if (!task?.projectId) return;
    setIsInitializingGit(true);
    try {
      await projectsApi.initGit(task.projectId);
      setGitInitDialogOpen(false);
      // Retry the task start with same mode
      if (pendingGitInitMode) {
        handleStartSessionWithMode(pendingGitInitMode);
      }
    } catch (error) {
      console.error('Failed to initialize git:', error);
      alert('Failed to initialize git. Please try again or initialize manually.');
      setGitInitDialogOpen(false);
    } finally {
      setIsInitializingGit(false);
      setPendingGitInitMode(null);
      setPendingGitInitPrompt(undefined);
    }
  }, [task?.projectId, pendingGitInitMode, handleStartSessionWithMode]);

  const handleGitInitCancel = useCallback(() => {
    setGitInitDialogOpen(false);
    setPendingGitInitMode(null);
    setPendingGitInitPrompt(undefined);
  }, []);

  // Tab change handler
  const handleTabChange = useCallback((tab: 'activity' | 'ai-session' | 'diffs' | 'sessions') => {
    startTransition(() => setActiveInfoTab(tab));
  }, [setActiveInfoTab]);

  // Check if session is running (use activeSession AND wsSessionStatus for immediate updates)
  // wsSessionStatus provides immediate feedback from WebSocket before React Query refetches
  // Keep WS connected for non-terminal states (queued, running, paused)
  // Disconnect only on terminal states (completed, failed, cancelled)
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

  // Approval handlers hook (uses sendApprovalResponse from WebSocket)
  const { handleApproveRequest, handleRejectRequest } = useApprovalHandlers({
    isWsConnected,
    isSessionLive,
    sendApprovalResponse,
    setPendingApprovals,
    setProcessingApproval,
  });

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

  // Close edit mode on click outside edit form
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
  const toggleCommand = (key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };


  // Handle paste from clipboard

  // File Details sub-panel state

  // Start task: Update status to in-progress AND start a new session
  const handleStartTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };
  const handleCancelTask = () => updateStatus('cancelled' as TaskStatus);
  // Continue task: Update status to in-progress AND start a new session
  const handleContinueTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };

  // File Details handlers
  const handleDiffFileClick = (fileId: string) => { setSelectedDiffFile(fileId); setSubPanelTab('diffs'); setIsSubPanelOpen(true); };
  const handleCloseFileDetails = () => { setSelectedDiffFile(null); setIsSubPanelOpen(false); };
  const handleExpandToSubPanel = () => { setSubPanelTab('chat-session'); setIsSubPanelOpen(true); };
  const handleApproveDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'approved' }));
  const handleRejectDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'rejected' }));

  // Get property icon for display
  const getPropertyIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      project: Folder, agent: Bot, provider: Sparkles, model: Zap,
      priority: Zap, skills: Zap, tools: Wrench, context: FileCode,
    };
    return icons[type] || FileCode;
  };

  // Get display value for property
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading task...
      </div>
    );
  }

  if (error || !task) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Task not found</div>;
  }

  return (
    <div className="h-full flex">
      {/* Main Content - adjusts width when File Details is open */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", (selectedDiffFile || isSubPanelOpen) ? "max-w-[50%]" : "")}>
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
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

          <div className="border-t border-border my-6" />

          {/* Tabbed Info Panel */}
          <div>
            <TaskInfoTabsNav
              activeTab={activeInfoTab}
              latestSession={latestSession}
              sessionsCount={sessions.length}
              onTabChange={handleTabChange}
              onExpandToSubPanel={handleExpandToSubPanel}
            />

            {/* Activity Tab - derived from task, sessions, gitCommitApprovals */}
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
      </ScrollArea>

      {/* Chat Input Footer - Fully encapsulated (rerender-defer-reads pattern) */}
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
      </div>

      {/* File Details Panel - shown on the right when a diff file is selected or sub-panel is open */}
      <FileDetailsPanel
        selectedDiffFile={selectedDiffFile}
        isSubPanelOpen={isSubPanelOpen}
        subPanelTab={subPanelTab}
        chatMessages={chatMessages}
        realtimeMessages={realtimeMessages}
        currentAssistantMessage={currentAssistantMessage}
        sessionDiffs={sessionDiffs}
        diffApprovals={diffApprovals}
        onCloseFileDetails={handleCloseFileDetails}
        onSetSubPanelTab={setSubPanelTab}
        onApproveDiff={handleApproveDiff}
        onRejectDiff={handleRejectDiff}
      />

      {/* Content Modal for Write tool preview */}
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

      {/* Git Init Confirmation Dialog */}
      <GitInitDialog
        open={gitInitDialogOpen}
        projectName={projectName || 'Unknown'}
        onConfirm={handleGitInitConfirm}
        onCancel={handleGitInitCancel}
        isLoading={isInitializingGit}
      />
    </div>
  );
}
