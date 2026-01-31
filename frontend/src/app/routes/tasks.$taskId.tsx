import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Folder, Bot, Sparkles, Zap,
  FileCode, Loader2, Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTaskDetail, useSessions, useTaskMessages, useSessionDiffs, useStartSession, useChatHandlers, useTaskWebSocket, useRealtimeState, sessionKeys, type TaskDetailProperty, type ToolUseBlock } from '@/shared/hooks';
import { propertyTypes, statusPropertyType, agentLabels, providerLabels, modelLabels } from '@/shared/config/property-config';
import { PropertyItem, type Property } from '@/shared/components/layout/floating-panels/property-item';
import type { TaskStatus } from '@/adapters/api/tasks-api';
import type { ApprovalRequest, SessionResumeMode } from '@/adapters/api/sessions-api';
import { sessionsApi } from '@/adapters/api/sessions-api';
import { gitApi, type GitCommitApproval } from '@/adapters/api/git-api';
// Shared types and utilities
import type { ChatMessage, UIDiff, ToolCommand } from '@/shared/types';
import { messageToChat, diffToUI } from '@/shared/utils';
import { getFilteredSessionIds } from '@/shared/utils/session-chain';
// Shared task-detail components
import {
  ContextWarningDialog, ChatInputFooter, ContentPreviewModal, TaskInfoTabsNav,
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
  const queryClient = useQueryClient();
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

  // Clear justStartedSession once query has the same session (sync complete)
  useEffect(() => {
    if (justStartedSession && latestSession?.id === justStartedSession.id) {
      setJustStartedSession(null);
    }
  }, [justStartedSession, latestSession?.id]);

  // Use just-started session if available, otherwise use latest from query
  const activeSession = justStartedSession || latestSession;
  const activeSessionId = activeSession?.id || '';

  // Track providerSessionId to maintain stable query during Resume
  // Resume continues same conversation (same providerSessionId), so keep using previous filter
  const previousProviderSessionIdRef = useRef<string | null>(null);
  const stableFilterSessionIds = useRef<string[] | null>(null);

  // Determine session chain filter for Renew mode
  // If there's a Renew in the chain, only show messages from Renew onwards
  // CRITICAL: Keep filter stable during Resume (same providerSessionId) to prevent scroll jump
  const filterSessionIds = useMemo(() => {
    if (!latestSession) return null;

    const currentProviderSessionId = latestSession.providerSessionId;

    // If providerSessionId hasn't changed, reuse previous filter (prevents refetch during Resume)
    if (currentProviderSessionId && currentProviderSessionId === previousProviderSessionIdRef.current) {
      return stableFilterSessionIds.current;
    }

    // ProviderSessionId changed or first load - recalculate filter
    const newFilter = getFilteredSessionIds(latestSession, sessions);
    previousProviderSessionIdRef.current = currentProviderSessionId;
    stableFilterSessionIds.current = newFilter;
    return newFilter;
  }, [latestSession, sessions]);

  // Fetch all messages for task (across all sessions) and diffs from active session
  // In Renew mode, only show messages from Renew session chain. In Retry/Resume, show all cumulative.
  const { data: apiMessages = [] } = useTaskMessages(taskId, 200, filterSessionIds);
  const { data: apiDiffs = [] } = useSessionDiffs(activeSessionId);

  // Convert API data to UI format
  const chatMessages: ChatMessage[] = apiMessages.map(messageToChat);
  const sessionDiffs: UIDiff[] = apiDiffs.map(diffToUI);

  // Keep chatMessagesRef in sync for WebSocket callback dedup (avoids stale closure)
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Pending approvals state
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  // Git commit approvals for activity timeline
  const [gitCommitApprovals, setGitCommitApprovals] = useState<GitCommitApproval[]>([]);

  useEffect(() => {
    if (!activeSessionId) return;
    sessionsApi.getPendingApprovals(activeSessionId)
      .then(res => setPendingApprovals(res.approvals))
      .catch(() => setPendingApprovals([]));
  }, [activeSessionId]);

  // Fetch git commit approvals for activity timeline
  useEffect(() => {
    if (!taskId) return;
    gitApi.getTaskApprovals(taskId)
      .then(res => setGitCommitApprovals(res.approvals))
      .catch(() => setGitCommitApprovals([]));
  }, [taskId]);

  // Handle approval/rejection - use WebSocket when connected, fallback to HTTP
  const handleApproveRequest = async (approvalId: string) => {
    setProcessingApproval(approvalId);
    try {
      if (isWsConnected && isSessionLive) {
        sendApprovalResponse(approvalId, true);
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      } else {
        await sessionsApi.approveRequest(approvalId);
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleRejectRequest = async (approvalId: string) => {
    setProcessingApproval(approvalId);
    try {
      if (isWsConnected && isSessionLive) {
        sendApprovalResponse(approvalId, false);
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      } else {
        await sessionsApi.rejectRequest(approvalId);
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessingApproval(null);
    }
  };

  // Start session with mode (retry/renew/fork)
  const handleStartSessionWithMode = async (mode: SessionResumeMode) => {
    if (!taskId) return;
    // Capture chat input BEFORE clearing state - pass as initialPrompt to backend
    const newPrompt = chatInput.trim() || undefined;
    // Prevent height collapse: lock container height before clearing state
    const container = aiSessionContainerRef.current;
    if (container) {
      container.style.minHeight = `${container.offsetHeight}px`;
    }
    // Only reset scroll tracking for 'renew' mode (fresh start)
    // For 'retry', preserve user's scroll position to avoid uncomfortable jump
    if (mode === 'renew') {
      userScrolledUpRef.current = false;
    }
    // Save scroll position for Resume (to restore after messages refetch)
    if (mode === 'retry' && container) {
      savedScrollPosition.current = container.scrollTop;
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
    setChatInput(''); // Clear after capturing
    setAttachedFiles([]); // Clear attached files
    setWsSessionStatus(null); // Reset WebSocket status for new session
    setJustStartedSession(null); // Clear previous
    // Release height lock after a short delay
    setTimeout(() => {
      if (container) container.style.minHeight = '';
    }, 500);
    // Add user message optimistically if there's a prompt (shows immediately in UI)
    if (newPrompt) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: newPrompt,
      };
      setRealtimeMessages([userMessage]);
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

  // UI state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs' | 'sessions'>('ai-session');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [showAddProperty, setShowAddProperty] = useState(false);
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());

  // Chat input options state (aligned with FloatingTaskDetailPanel)
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<'default' | 'haiku' | 'sonnet' | 'opus'>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [chatPermissionMode, setChatPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('default');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // @ mention context picker state
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [contextPickerIndex, setContextPickerIndex] = useState(0);
  const contextPickerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  // Scroll restoration state (will be extracted in 2.4)
  const aiSessionContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const savedScrollPosition = useRef<number | null>(null);
  const isRestoringScroll = useRef(false);
  const [isScrolledUpFromBottom, setIsScrolledUpFromBottom] = useState(false);

  // Container lifecycle tracking removed (too noisy)

  // Restore scroll position after Resume (when messages refetch)
  // Use useLayoutEffect for synchronous execution before browser paint
  useLayoutEffect(() => {
    // Prevent duplicate restoration attempts (useLayoutEffect can trigger multiple times)
    if (isRestoringScroll.current) {
      return;
    }

    if (savedScrollPosition.current !== null && aiSessionContainerRef.current) {
      const scrollPos = savedScrollPosition.current;
      const container = aiSessionContainerRef.current;

      // KEY FIX: Only restore if container is tall enough
      // During Resume, messages are cleared first, causing scrollHeight to drop
      // Wait until messages are loaded and scrollHeight >= saved position
      if (container.scrollHeight >= scrollPos + container.clientHeight) {
        isRestoringScroll.current = true;

        // Wait for DOM to fully render before restoring
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (aiSessionContainerRef.current) {
              aiSessionContainerRef.current.scrollTop = scrollPos;
            }
            savedScrollPosition.current = null;
            // Keep restoration flag active briefly to prevent auto-scroll override
            setTimeout(() => {
              isRestoringScroll.current = false;
            }, 100);
          });
        });
      }
      // Container too short - wait for more messages to load (will retry on next update)
    }
  }, [chatMessages]);

  // Auto-scroll to bottom when streaming (only if user hasn't scrolled up)
  useEffect(() => {
    // Don't auto-scroll if currently restoring scroll position
    if (isRestoringScroll.current) return;

    const container = aiSessionContainerRef.current;
    if (!container || !currentAssistantMessage) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom || !userScrolledUpRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [currentAssistantMessage]);

  // Sample project files - in real implementation, fetch from API
  const projectFiles = [
    'src/index.ts', 'src/app.tsx', 'src/components/Button.tsx', 'src/components/Modal.tsx',
    'src/hooks/useAuth.ts', 'src/utils/helpers.ts', 'package.json', 'tsconfig.json', 'README.md',
  ];

  // Filter files based on search
  const filteredFiles = projectFiles.filter(f => f.toLowerCase().includes(contextSearch.toLowerCase()));

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
  }, [showAddProperty]);

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
  }, [isEditing, cancelEdit]);
  const toggleCommand = (key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Close model dropdown on click outside
  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  // Close permission dropdown on click outside
  useEffect(() => {
    if (!showPermissionDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) setShowPermissionDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPermissionDropdown]);

  // Close context picker on click outside
  useEffect(() => {
    if (!showContextPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextPickerRef.current && !contextPickerRef.current.contains(e.target as Node)) setShowContextPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextPicker]);

  // Reset picker index when search changes
  useEffect(() => { setContextPickerIndex(0); }, [contextSearch]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filePaths = Array.from(files).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...filePaths]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const filePaths = Array.from(files).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...filePaths]);
    }
  }, []);

  // Handle paste from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file.name);
      }
    }
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  // Handle input change - detect @ trigger
  const handleChatInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setChatInput(value);
    setCursorPosition(cursorPos);
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setContextSearch(textAfterAt);
        setShowContextPicker(true);
        return;
      }
    }
    setShowContextPicker(false);
  }, []);

  // Select file from context picker
  const selectContextFile = useCallback((file: string) => {
    const textBeforeCursor = chatInput.slice(0, cursorPosition);
    const textAfterCursor = chatInput.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${file} ` + textAfterCursor;
    setChatInput(newText);
    setShowContextPicker(false);
    setContextSearch('');
    if (!attachedFiles.includes(file)) setAttachedFiles(prev => [...prev, file]);
    chatInputRef.current?.focus();
  }, [chatInput, cursorPosition, attachedFiles]);

  // Handle keyboard navigation in context picker
  const handleContextPickerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showContextPicker) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setContextPickerIndex(prev => Math.min(prev + 1, filteredFiles.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setContextPickerIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && filteredFiles.length > 0) { e.preventDefault(); selectContextFile(filteredFiles[contextPickerIndex]); }
    else if (e.key === 'Escape') setShowContextPicker(false);
  }, [showContextPicker, filteredFiles, contextPickerIndex, selectContextFile]);

  // File Details sub-panel state
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false);

  // Content modal state for Write tool preview
  const [contentModalData, setContentModalData] = useState<{ filePath: string; content: string } | null>(null);

  // Chat handlers hook
  const { sendMessage, handleChatKeyDown } = useChatHandlers({
    isWsConnected,
    isSessionLive,
    chatInput,
    attachedFiles,
    selectedModel,
    chatPermissionMode,
    webSearchEnabled,
    isWaitingForResponse,
    isTyping,
    showContextPicker,
    sendUserInput,
    setRealtimeMessages,
    setChatInput,
    setAttachedFiles,
    setIsWaitingForResponse,
    setCurrentAssistantMessage,
    setIsTyping,
  });

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
              onTabChange={setActiveInfoTab}
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
                userScrolledUpRef={userScrolledUpRef}
                isScrolledUpFromBottom={isScrolledUpFromBottom}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onToggleCommand={toggleCommand}
                onSetContentModal={setContentModalData}
                onOpenFileAsTab={openFileAsTab}
                onSetScrolledUp={setIsScrolledUpFromBottom}
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

      {/* Chat Input Footer */}
      <ChatInputFooter
        latestSession={latestSession}
        isSessionLive={isSessionLive}
        isWsConnected={isWsConnected}
        task={task}
        isStartingSession={isStartingSession}
        isUpdating={isUpdating}
        chatInput={chatInput}
        attachedFiles={attachedFiles}
        selectedModel={selectedModel}
        webSearchEnabled={webSearchEnabled}
        chatPermissionMode={chatPermissionMode}
        isDragOver={isDragOver}
        showContextPicker={showContextPicker}
        filteredFiles={filteredFiles}
        contextPickerIndex={contextPickerIndex}
        showModelDropdown={showModelDropdown}
        showPermissionDropdown={showPermissionDropdown}
        chatInputRef={chatInputRef as React.RefObject<HTMLInputElement>}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        contextPickerRef={contextPickerRef as React.RefObject<HTMLDivElement>}
        modelDropdownRef={modelDropdownRef as React.RefObject<HTMLDivElement>}
        permissionDropdownRef={permissionDropdownRef as React.RefObject<HTMLDivElement>}
        onChatInputChange={handleChatInputChange}
        onChatKeyDown={handleChatKeyDown}
        onContextPickerKeyDown={handleContextPickerKeyDown}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onRemoveFile={removeAttachedFile}
        onFileSelect={handleFileSelect}
        onSelectContextFile={selectContextFile}
        onAddContext={() => { setChatInput(chatInput + '@'); setShowContextPicker(true); chatInputRef.current?.focus(); }}
        onSetSelectedModel={setSelectedModel}
        onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
        onSetPermissionMode={setChatPermissionMode}
        onToggleModelDropdown={() => setShowModelDropdown(!showModelDropdown)}
        onTogglePermissionDropdown={() => setShowPermissionDropdown(!showPermissionDropdown)}
        onSendMessage={sendMessage}
        onSendCancel={sendCancel}
        onStartTask={handleStartTask}
        onStartSessionWithMode={handleStartSessionWithMode}
        onCancelTask={handleCancelTask}
        onContinueTask={handleContinueTask}
        isWaitingForResponse={isWaitingForResponse}
        isTyping={isTyping}
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
