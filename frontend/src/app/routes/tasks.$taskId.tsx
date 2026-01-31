import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Folder, Bot, Sparkles, Zap,
  FileCode, Loader2, Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTaskDetail, useSessions, useTaskMessages, useSessionDiffs, useStartSession, useTaskWebSocket, useRealtimeState, useMessageConversion, useFilteredSessionIds, useTaskUIState, useScrollRestoration, useApprovalState, useApprovalHandlers, type TaskDetailProperty } from '@/shared/hooks';
import { propertyTypes, statusPropertyType, agentLabels, providerLabels, modelLabels } from '@/shared/config/property-config';
import type { TaskStatus } from '@/adapters/api/tasks-api';
import type { SessionResumeMode } from '@/adapters/api/sessions-api';
// Shared types and utilities
import type { ChatMessage } from '@/shared/types';
// Shared task-detail components
import {
  ContextWarningDialog, ChatInputFooter, type ChatInputFooterHandle, ContentPreviewModal, TaskInfoTabsNav,
  FileDetailsPanel, TaskEditPanel,
} from '@/shared/components/task-detail';
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

  // Fetch sessions for this task - get LATEST session by createdAt
  const { data: sessions = [] } = useSessions({ taskId });
  const latestSession = [...sessions].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Context window warning hook
  const { showWarning, dismissWarning } = useContextWarning(latestSession);

  // Start session mutation (invalidates queries automatically)
  const startSessionMutation = useStartSession();

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

  // Start session with mode (retry/renew/fork)
  const handleStartSessionWithMode = async (mode: SessionResumeMode) => {
    if (!taskId) return;
    // Capture chat input BEFORE clearing state - pass as initialPrompt to backend
    // Read from ChatInputFooter ref (no subscription - rerender-defer-reads pattern)
    const newPrompt = chatInputFooterRef.current?.getChatInput() || undefined;
    // Prevent height collapse: lock container height before clearing state
    const container = aiSessionContainerRef.current;
    if (container) {
      container.style.minHeight = `${container.offsetHeight}px`;
    }
    // Only reset scroll tracking for 'renew' mode (fresh start)
    // For 'retry', preserve user's scroll position to avoid uncomfortable jump
    if (mode === 'renew') {
      resetScrollState(); // ✅ Encapsulated method
    }
    // Save scroll position for Resume (to restore after messages refetch)
    if (mode === 'retry') {
      saveScrollPosition(); // ✅ Encapsulated method instead of direct ref mutation
    }
    // Clear chat state - ONLY for Renew mode
    // Resume mode keeps existing messages to prevent scroll jump
    if (mode === 'renew') {
      setRealtimeMessages([]);
      setCurrentAssistantMessage('');
      setStreamingToolUses([]);
      setMessageBuffers({}); // Clear delta streaming buffers
      processedMessageIds.current.clear(); // Clear processed message IDs for new session
    } else {
      // Only clear streaming state, keep messages
      setStreamingToolUses([]);
      setCurrentAssistantMessage('');
      setMessageBuffers({}); // Clear delta streaming buffers
    }
    // Clear chat input and attached files via ref (encapsulated in ChatInputFooter)
    if (newPrompt) {
      chatInputFooterRef.current?.clearChatInput();
    }
    setWsSessionStatus(null); // Reset WebSocket status for new session
    setJustStartedSession(null); // Clear previous
    // Release height lock after a short delay
    setTimeout(() => {
      if (container) container.style.minHeight = '';
    }, 500);
    // Add user message optimistically if there's a prompt (shows immediately in UI)
    if (newPrompt) {
      const userMessage: ChatMessage = {
        id: `user-optimistic-${++messageCounterRef.current}`,
        role: 'user',
        content: newPrompt,
      };
      // APPEND for retry/resume (preserve history), REPLACE for renew (fresh start)
      if (mode === 'renew') {
        setRealtimeMessages([userMessage]);
      } else {
        setRealtimeMessages(prev => [...prev, userMessage]);
      }
    }
    // Show "AI is thinking..." BEFORE async call (not after - race condition with WebSocket)
    setIsWaitingForResponse(true);
    try {
      const response = await startSessionMutation.mutateAsync({
        taskId,
        mode,
        initialPrompt: newPrompt, // Pass chat input as new instruction
      });
      console.log('Session started:', response.session.id, 'wsUrl:', response.wsUrl);
      // Set just-started session for immediate WebSocket connection
      // Always use 'running' status to ensure WebSocket connects (actual status comes via WebSocket)
      setJustStartedSession({ id: response.session.id, status: 'running' });
      // Switch to AI Session tab only if not already there (prevents unnecessary re-render)
      if (activeInfoTab !== 'ai-session') {
        setActiveInfoTab('ai-session');
      }
    } catch (err) {
      setIsWaitingForResponse(false);
      console.error('Failed to start session:', err);
    }
  };
  const isStartingSession = startSessionMutation.isPending;

  // UI state hook (chat state moved to ChatInputFooter for performance)
  const {
    isDescriptionExpanded, setIsDescriptionExpanded,
    activeInfoTab, setActiveInfoTab,
    isTyping, setIsTyping, // Keep at parent - displayed in AISessionTab
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

  // Ref to ChatInputFooter imperative handle (rerender-defer-reads pattern)
  const chatInputFooterRef = useRef<ChatInputFooterHandle>(null);

  // Tab change handler with startTransition (keeps UI responsive during heavy tab renders)
  const handleTabChange = useCallback((tab: 'activity' | 'ai-session' | 'diffs' | 'sessions') => {
    startTransition(() => setActiveInfoTab(tab));
  }, [setActiveInfoTab]);

  // Real-time WebSocket chat state
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

  // Scroll container refs (parent-owned, passed to hooks and components)
  const aiSessionContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);

  // Optimistic message ID counter (React purity compliant)
  const messageCounterRef = useRef(0);

  // Scroll restoration hook (encapsulated state mutations)
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

  // Sample project files - in real implementation, fetch from API

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
    </div>
  );
}
