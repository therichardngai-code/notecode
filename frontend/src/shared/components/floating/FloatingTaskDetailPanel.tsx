import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  X, ChevronsRight, Sparkles, Folder, Bot, Zap, Calendar, User, Play, Pause, CheckCircle, Clock,
  ExternalLink, GripVertical, Pencil, Check, Plus, Wrench, Maximize2, ChevronDown, ChevronRight,
  AtSign, Paperclip, Globe, MessageSquare, FileCode, GitBranch, Terminal, ThumbsUp, ThumbsDown, Loader2,
  RotateCcw, RefreshCw, Copy, ShieldAlert, Eye,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { type StatusId } from '@/shared/config/task-config';
import {
  propertyTypes, statusPropertyType,
  agentLabels, providerLabels, modelLabels,
} from '@/shared/config/property-config';
import { useTaskDetail, useSessions, useTaskMessages, useSessionDiffs, useSessionWebSocket, useStartSession, sessionKeys, type TaskDetailProperty, type ToolUseBlock } from '@/shared/hooks';
import { PropertyItem, type Property } from '@/shared/components/layout/floating-panels/property-item';
import type { TaskStatus } from '@/adapters/api/tasks-api';
import type { ApprovalRequest, SessionResumeMode } from '@/adapters/api/sessions-api';
import { sessionsApi } from '@/adapters/api/sessions-api';
import { gitApi, type TaskGitStatus, type GitCommitApproval } from '@/adapters/api/git-api';
import { MarkdownMessage } from '@/shared/components/ui/markdown-message';
// Shared types and utilities
import type { ChatMessage, UIDiff } from '@/shared/types';
import { messageToChat, diffToUI } from '@/shared/utils';
import { getFilteredSessionIds } from '@/shared/utils/session-chain';
// Shared task-detail components
import {
  StatusBadge, PriorityBadge, PropertyRow, ApprovalCard,
  AttemptStats, GitStatusCard,
} from '@/shared/components/task-detail';
import { useUIStore } from '@/shared/stores';

interface FloatingTaskDetailPanelProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onOpenFullView?: (taskId: string, taskTitle: string) => void;
}

// Combined property types for Task Detail (includes status)
const taskDetailPropertyTypes = [statusPropertyType, ...propertyTypes];

// NOTE: Types (ChatMessage, UIDiff) imported from @/shared/types
// NOTE: Utils (messageToChat, diffToUI) imported from @/shared/utils
export function FloatingTaskDetailPanel({ isOpen, taskId, onClose }: FloatingTaskDetailPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const openFileAsTab = useUIStore((s) => s.openFileAsTab);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  // Shared hook - single source of truth (API only, no Zustand)
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

  // Fetch sessions for this task - get LATEST session by createdAt
  const { data: sessions = [] } = useSessions({ taskId: taskId || '' });
  const latestSession = [...sessions].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Start session mutation (invalidates queries automatically) - same as FullView
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
    console.log('[SCROLL DEBUG FloatingView] filterSessionIds calculation:', {
      currentProviderSessionId,
      previousProviderSessionId: previousProviderSessionIdRef.current,
      sessionId: latestSession.id,
    });

    // If providerSessionId hasn't changed, reuse previous filter (prevents refetch during Resume)
    if (currentProviderSessionId && currentProviderSessionId === previousProviderSessionIdRef.current) {
      console.log('[SCROLL DEBUG FloatingView] Same providerSessionId - keeping stable filter to prevent scroll jump');
      return stableFilterSessionIds.current;
    }

    // ProviderSessionId changed or first load - recalculate filter
    console.log('[SCROLL DEBUG FloatingView] ProviderSessionId changed - recalculating filter');
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
  const sessionMessages: ChatMessage[] = apiMessages.map(messageToChat);
  const sessionDiffs: UIDiff[] = apiDiffs.map(diffToUI);

  // Real-time chat state for WebSocket messages (same as FullView)
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [currentToolUse, setCurrentToolUse] = useState<ToolUseBlock | null>(null);
  const [streamingToolUses, setStreamingToolUses] = useState<ToolCommand[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  // Track session status from WebSocket (more immediate than React Query)
  const [wsSessionStatus, setWsSessionStatus] = useState<string | null>(null);
  // Message buffers for delta streaming (per-message incremental content)
  const [, setMessageBuffers] = useState<Record<string, string>>({});
  // Ref for streaming buffer (avoids stale closure in finalization)
  const streamingBufferRef = useRef<string>('');
  // Ref for AI session container (prevents height collapse on Resume)
  const aiSessionContainerRef = useRef<HTMLDivElement>(null);
  // Track if user has scrolled up (to prevent auto-scroll to bottom when reading history)
  const userScrolledUpRef = useRef(false);
  // Ref for chatMessages to enable dedup in WebSocket callback (avoids stale closure)
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  // Track processed message IDs to prevent duplicates (messageId-based dedup)
  const processedMessageIds = useRef<Set<string>>(new Set());
  // Save scroll position before Resume to restore after messages refetch
  const savedScrollPosition = useRef<number | null>(null);
  // Track if currently restoring scroll (prevent auto-scroll override)
  const isRestoringScroll = useRef(false);

  // WebSocket connection for active running session
  // Check if session is running (use activeSession AND wsSessionStatus for immediate updates)
  // Keep WS connected for non-terminal states (queued, running, paused)
  // Disconnect only on terminal states (completed, failed, cancelled)
  const terminalStates = ['completed', 'failed', 'cancelled'];
  const isSessionLive = activeSession &&
    !terminalStates.includes(activeSession.status) &&
    (wsSessionStatus === null || !terminalStates.includes(wsSessionStatus));
  const {
    isConnected: isWsConnected,
    sendUserInput,
    sendCancel,
    sendApprovalResponse,
  } = useSessionWebSocket({
    sessionId: activeSessionId,
    enabled: isSessionLive,
    // Same callbacks as FullView (tasks.$taskId.tsx)
    onMessage: (text, isFinal, messageId) => {
      if (isFinal) {
        // Use ref for authoritative buffer value (avoids stale closure)
        const finalContent = streamingBufferRef.current + (text || '');
        const msgId = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (finalContent && !processedMessageIds.current.has(msgId)) {
          // Dedupe by messageId: check against BOTH realtimeMessages AND chatMessages (API)
          const apiHasMessage = chatMessagesRef.current.some(m => m.id === msgId);
          if (!apiHasMessage) {
            setRealtimeMessages(prev => {
              if (prev.some(m => m.id === msgId)) return prev;
              return [...prev, {
                id: msgId,
                role: 'assistant',
                content: finalContent,
                commands: streamingToolUses.length > 0 ? streamingToolUses : undefined,
              }];
            });
            processedMessageIds.current.add(msgId);
          }
        }
        streamingBufferRef.current = '';
        setCurrentAssistantMessage('');
        setCurrentToolUse(null);
        setStreamingToolUses([]);
        setIsWaitingForResponse(false);
      } else {
        streamingBufferRef.current += text;
        setCurrentAssistantMessage(streamingBufferRef.current);
      }
    },
    onToolUse: (tool) => {
      setCurrentToolUse(tool);
      setStreamingToolUses(prev => [...prev, {
        cmd: tool.name,
        status: 'success',
        input: tool.input,
      }]);
    },
    onStatus: (status) => {
      // Update WebSocket session status immediately (before React Query refetch)
      setWsSessionStatus(status);
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        // NOTE: Don't add message here - onMessage('', true) already handles it
        // Adding here causes duplication due to stale closure
        setCurrentToolUse(null);
        setIsWaitingForResponse(false);
        // Refetch session data to update status in UI
        if (activeSessionId) {
          queryClient.invalidateQueries({ queryKey: sessionKeys.messages(activeSessionId) });
          queryClient.invalidateQueries({ queryKey: sessionKeys.detail(activeSessionId) });
          queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        }
      }
    },
    onApprovalRequired: (data) => {
      // Add to pending approvals state
      setPendingApprovals((prev) => [
        ...prev,
        {
          id: data.requestId,
          sessionId: activeSessionId,
          type: 'tool',
          payload: { toolName: data.toolName, toolInput: data.toolInput as ApprovalRequest['payload']['toolInput'] },
          toolCategory: data.category,
          status: 'pending',
          timeoutAt: new Date(data.timeoutAt).toISOString(),
          decidedAt: null,
          decidedBy: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    onError: (message) => {
      console.error('WebSocket error:', message);
      setIsWaitingForResponse(false);
    },
    onDisconnected: () => {
      // Reset waiting state when WebSocket disconnects to prevent chat from being blocked
      // Use ref for authoritative buffer value (avoids stale closure)
      if (streamingBufferRef.current) {
        setRealtimeMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: streamingBufferRef.current }]);
        streamingBufferRef.current = '';
        setCurrentAssistantMessage('');
      }
      setCurrentToolUse(null);
      setIsWaitingForResponse(false);
    },
    // Delta streaming callbacks
    onDelta: (messageId, text, _offset) => {
      // Append delta to message buffer for incremental streaming
      setMessageBuffers(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || '') + text,
      }));
      // Update current streaming display
      setCurrentAssistantMessage((prev) => prev + text);
    },
    onStreamingBuffer: (messageId, content, _offset) => {
      // Reconnect catch-up: restore buffered content
      setMessageBuffers(prev => ({
        ...prev,
        [messageId]: content,
      }));
      setCurrentAssistantMessage(content);
    },
    onUserMessageSaved: (messageId, _content) => {
      // User message confirmed saved to backend
      console.log('User message saved:', messageId);
      // Optionally update message ID for user message if needed
    },
  });

  // Pending approvals state
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  // Git status state
  const [gitStatus, setGitStatus] = useState<TaskGitStatus | null>(null);

  // Git commit approvals for activity timeline
  const [gitCommitApprovals, setGitCommitApprovals] = useState<GitCommitApproval[]>([]);

  // Fetch pending approvals for active session
  useEffect(() => {
    if (!activeSessionId) return;
    sessionsApi.getPendingApprovals(activeSessionId)
      .then(res => setPendingApprovals(res.approvals))
      .catch(() => setPendingApprovals([]));
  }, [activeSessionId]);

  // Fetch git status for task
  useEffect(() => {
    if (!taskId) return;
    gitApi.getTaskGitStatus(taskId)
      .then(setGitStatus)
      .catch(() => setGitStatus(null));
  }, [taskId]);

  // Fetch git commit approvals for activity timeline
  useEffect(() => {
    if (!taskId) return;
    gitApi.getTaskApprovals(taskId)
      .then(res => setGitCommitApprovals(res.approvals))
      .catch(() => setGitCommitApprovals([]));
  }, [taskId]);

  // Handle approval/rejection - use WebSocket when connected, fallback to HTTP
  const handleApprove = async (approvalId: string) => {
    setProcessingApproval(approvalId);
    try {
      if (isWsConnected && isSessionLive) {
        // Send via WebSocket for immediate response
        sendApprovalResponse(approvalId, true);
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      } else {
        // Fallback to HTTP
        await sessionsApi.approveRequest(approvalId);
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setProcessingApproval(approvalId);
    try {
      if (isWsConnected && isSessionLive) {
        // Send via WebSocket for immediate response
        sendApprovalResponse(approvalId, false);
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      } else {
        // Fallback to HTTP
        await sessionsApi.rejectRequest(approvalId);
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessingApproval(null);
    }
  };

  // Start session with mode (retry/renew/fork) - same as FullView
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
      console.log('[SCROLL DEBUG FloatingView] Renew mode - resetting scroll tracking');
      userScrolledUpRef.current = false;
    }
    // Save scroll position for Resume (to restore after messages refetch)
    if (mode === 'retry' && container) {
      console.log('[SCROLL DEBUG FloatingView] Resume clicked - saving scroll position:', {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        containerExists: !!container,
      });
      savedScrollPosition.current = container.scrollTop;
    }
    // Clear chat state - ONLY for Renew mode
    // Resume mode keeps existing messages to prevent scroll jump
    if (mode === 'renew') {
      console.log('[SCROLL DEBUG FloatingView] Renew mode - clearing all messages');
      setRealtimeMessages([]);
      setCurrentAssistantMessage('');
      setStreamingToolUses([]);
      setMessageBuffers({}); // Clear delta streaming buffers
      processedMessageIds.current.clear(); // Clear processed message IDs for new session
    } else {
      console.log('[SCROLL DEBUG FloatingView] Resume mode - keeping existing messages to prevent scroll jump');
      // Only clear streaming state, keep messages
      setCurrentAssistantMessage('');
      setStreamingToolUses([]);
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
      // Switch to AI Session tab to show real-time chat
      setActiveInfoTab('ai-session');
    } catch (err) {
      setIsWaitingForResponse(false);
      console.error('Failed to start session:', err);
    }
  };
  const isStartingSession = startSessionMutation.isPending;

  // Full View handler - opens task in current tab
  const handleFullView = () => {
    if (taskId && task) {
      // Navigate directly (same approach as task card menu)
      navigate({ to: '/tasks/$taskId', params: { taskId } });
      onClose();
    }
  };

  // UI state for property dropdown
  const [showAddProperty, setShowAddProperty] = useState(false);
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs' | 'sessions'>('ai-session');
  const [isSubPanelOpen, setIsSubPanelOpen] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');
  const [contentModalData, setContentModalData] = useState<{ filePath: string; content: string } | null>(null);
  const subPanelRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Keep chatMessagesRef in sync for WebSocket callback dedup (avoids stale closure)
  useEffect(() => {
    chatMessagesRef.current = sessionMessages;
  }, [sessionMessages]);

  // Restore scroll position after Resume (when messages refetch)
  // Use useLayoutEffect for synchronous execution before browser paint
  useLayoutEffect(() => {
    console.log('[SCROLL DEBUG FloatingView] useLayoutEffect triggered - sessionMessages count:', sessionMessages.length, {
      hasSavedPosition: savedScrollPosition.current !== null,
      savedPosition: savedScrollPosition.current,
      containerExists: !!aiSessionContainerRef.current,
      currentScrollTop: aiSessionContainerRef.current?.scrollTop,
      scrollHeight: aiSessionContainerRef.current?.scrollHeight,
      isRestoringScroll: isRestoringScroll.current,
    });

    // Prevent duplicate restoration attempts (useLayoutEffect can trigger multiple times)
    if (isRestoringScroll.current) {
      console.log('[SCROLL DEBUG FloatingView] Already restoring - skipping duplicate attempt');
      return;
    }

    if (savedScrollPosition.current !== null && aiSessionContainerRef.current) {
      const scrollPos = savedScrollPosition.current;
      const container = aiSessionContainerRef.current;

      console.log('[SCROLL DEBUG FloatingView] Checking if can restore - scrollHeight:', container.scrollHeight, 'vs needed:', scrollPos);

      // KEY FIX: Only restore if container is tall enough
      // During Resume, messages are cleared first, causing scrollHeight to drop
      // Wait until messages are loaded and scrollHeight >= saved position
      if (container.scrollHeight >= scrollPos + container.clientHeight) {
        isRestoringScroll.current = true;
        console.log('[SCROLL DEBUG FloatingView] Container tall enough - starting restoration to:', scrollPos);

        // Wait for DOM to fully render before restoring
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[SCROLL DEBUG FloatingView] RAF callback - about to restore scroll');
            if (aiSessionContainerRef.current) {
              console.log('[SCROLL DEBUG FloatingView] Before restore:', aiSessionContainerRef.current.scrollTop);
              aiSessionContainerRef.current.scrollTop = scrollPos;
              console.log('[SCROLL DEBUG FloatingView] After restore:', aiSessionContainerRef.current.scrollTop, 'Expected:', scrollPos);
            } else {
              console.error('[SCROLL DEBUG FloatingView] Container lost during RAF!');
            }
            savedScrollPosition.current = null;
            // Keep restoration flag active briefly to prevent auto-scroll override
            setTimeout(() => {
              isRestoringScroll.current = false;
              console.log('[SCROLL DEBUG FloatingView] Restoration complete - flag cleared');
            }, 100);
          });
        });
      } else {
        console.log('[SCROLL DEBUG FloatingView] Container too short - waiting for more messages to load');
        // Don't clear savedScrollPosition - let it retry on next sessionMessages update
      }
    }
  }, [sessionMessages]);

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

  // Chat input options state
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<'default' | 'haiku' | 'sonnet' | 'opus'>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [chatPermissionMode, setChatPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('default');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close model dropdown on click outside
  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  // Close permission dropdown on click outside
  useEffect(() => {
    if (!showPermissionDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) {
        setShowPermissionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPermissionDropdown]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filePaths = Array.from(files).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...filePaths]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const filePaths = Array.from(files).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...filePaths]);
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file.name);
      }
    }
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  // @ mention context picker
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const contextPickerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sample project files - in real implementation, fetch from API
  const projectFiles = [
    'src/index.ts',
    'src/app.tsx',
    'src/components/Button.tsx',
    'src/components/Modal.tsx',
    'src/hooks/useAuth.ts',
    'src/utils/helpers.ts',
    'package.json',
    'tsconfig.json',
    'README.md',
  ];

  // Filter files based on search
  const filteredFiles = projectFiles.filter(f =>
    f.toLowerCase().includes(contextSearch.toLowerCase())
  );

  // Handle input change - detect @ trigger
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setChatInput(value);
    setCursorPosition(cursorPos);

    // Check if @ was just typed
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Show picker if @ is at start or after space, and no space after @
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setContextSearch(textAfterAt);
        setShowContextPicker(true);
        return;
      }
    }
    setShowContextPicker(false);
  };

  // Select file from context picker
  const selectContextFile = (file: string) => {
    const textBeforeCursor = chatInput.slice(0, cursorPosition);
    const textAfterCursor = chatInput.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    // Replace @search with @file
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${file} ` + textAfterCursor;
    setChatInput(newText);
    setShowContextPicker(false);
    setContextSearch('');

    // Also add to attached files
    if (!attachedFiles.includes(file)) {
      setAttachedFiles(prev => [...prev, file]);
    }

    // Focus back to input
    chatInputRef.current?.focus();
  };

  // Close context picker on click outside
  useEffect(() => {
    if (!showContextPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextPickerRef.current && !contextPickerRef.current.contains(e.target as Node)) {
        setShowContextPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextPicker]);

  // Handle keyboard navigation in context picker
  const [contextPickerIndex, setContextPickerIndex] = useState(0);
  const handleContextPickerKeyDown = (e: React.KeyboardEvent) => {
    if (!showContextPicker) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setContextPickerIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setContextPickerIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles.length > 0) {
      e.preventDefault();
      selectContextFile(filteredFiles[contextPickerIndex]);
    } else if (e.key === 'Escape') {
      setShowContextPicker(false);
    }
  };

  // Reset picker index when search changes
  useEffect(() => {
    setContextPickerIndex(0);
  }, [contextSearch]);

  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());
  const toggleCommand = (key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Reset add property dropdown when panel closes
  useEffect(() => { if (!isOpen) { setShowAddProperty(false); } }, [isOpen]);

  // Close add property dropdown on click outside
  useEffect(() => {
    if (!showAddProperty) return;
    const handleClickOutside = (e: MouseEvent) => { if (addPropertyRef.current && !addPropertyRef.current.contains(e.target as Node)) setShowAddProperty(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddProperty]);

  // Handle edit mode actions
  const handleStartEdit = () => startEdit();
  const handleCancelEdit = () => { cancelEdit(); setShowAddProperty(false); };
  const handleSaveEdit = async () => { await saveEdit(); setShowAddProperty(false); };
  const handleAddProperty = (type: TaskDetailProperty['type']) => { addProperty(type); setShowAddProperty(false); };

  // Helper functions for property display
  const getPropertyIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      project: Folder, agent: Bot, provider: Sparkles, model: Zap,
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

  // Chat handlers - use WebSocket when connected
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (isWaitingForResponse || isTyping) return;

    // Build message content with attached files
    let fullContent = content.trim();
    if (attachedFiles.length > 0) {
      const filesContext = attachedFiles.map(f => `@${f}`).join(' ');
      fullContent = `${filesContext}\n\n${fullContent}`;
    }

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: fullContent };

    // If WebSocket is connected (session running), send via WebSocket
    if (isWsConnected && isSessionLive) {
      setRealtimeMessages(prev => [...prev, userMessage]);
      setChatInput('');
      setAttachedFiles([]);
      setIsWaitingForResponse(true);
      setCurrentAssistantMessage('');
      sendUserInput(content.trim(), {
        model: selectedModel !== 'default' ? `claude-3-5-${selectedModel}-latest` : undefined,
        permissionMode: chatPermissionMode !== 'default' ? chatPermissionMode : undefined,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
        disableWebTools: !webSearchEnabled, // true = disable web search
      });
    } else {
      // Fallback: just add to local messages (no active session) - same as FullView
      setChatInput('');
      setAttachedFiles([]);
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showContextPicker) { e.preventDefault(); sendMessage(chatInput); }
  };

  // Start task: Update status to in-progress AND start a new session - same as FullView
  const handleStartTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };
  const handleCancelTask = () => updateStatus('cancelled' as TaskStatus);
  // Continue task: Update status to in-progress AND start a new session - same as FullView
  const handleContinueTask = async () => {
    await updateStatus('in-progress' as TaskStatus);
    await handleStartSessionWithMode('renew');
  };
  const handleDiffFileClick = (fileId: string) => {
    setSelectedDiffFile(fileId);
    setSubPanelTab('diffs');
    // In full view, show inline split; otherwise open sub-panel
    setIsSubPanelOpen(true);
  };
  const handleCloseSubPanel = () => { setIsSubPanelOpen(false); setSelectedDiffFile(null); };
  const handleApproveDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'approved' }));
  const handleRejectDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'rejected' }));

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => { const newWidth = Math.max(480, Math.min(window.innerWidth - e.clientX, window.innerWidth - 560)); setPanelWidth(newWidth); };
    const handleMouseUp = () => { setIsResizing(false); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  }, [isResizing]);

  // Close on click outside (exclude sub-panel)
  // If in edit mode, cancel edit instead of closing panel
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        // Don't close if clicking inside main panel or sub-panel
        if (panelRef.current?.contains(target)) return;
        if (subPanelRef.current?.contains(target)) return;
        // If in edit mode, cancel edit first instead of closing
        if (isEditing) {
          cancelEdit();
          setShowAddProperty(false);
          return;
        }
        onClose();
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, isEditing, cancelEdit]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div ref={panelRef} style={{ width: `${panelWidth}px`, right: isSubPanelOpen ? 800 : 0, transform: 'translateX(0)' }}
        className={cn("fixed top-0 h-full", isSubPanelOpen ? "z-[56]" : "z-50", "glass-strong border-l border-border/50", "flex flex-col", !isResizing && "transition-all duration-300 ease-in-out")}>
        {/* Resize Handle */}
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group">
          <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsSubPanelOpen(false); onClose(); }} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><ChevronsRight className="w-4 h-4 text-muted-foreground" /></button>
            <span className="text-sm text-muted-foreground">Task Details</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleFullView} disabled={!task} className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50" title="Full view">
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => { setIsSubPanelOpen(false); onClose(); }} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Content - show loading or task not found states */}
        <div className="flex-1 overflow-hidden p-4 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !task ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Task not found
            </div>
          ) : (
          <div>
          {isEditing ? (
            <>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-2xl font-medium text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6" placeholder="Task title" />
              {/* Editable Properties - using shared PropertyItem (Project/Provider not editable) */}
              <div className="space-y-3 mb-4">
                {editProperties
                  .filter((p) => p.type !== 'status' && p.type !== 'project' && p.type !== 'provider')
                  .map((property) => (
                    <PropertyItem
                      key={property.id}
                      property={property as Property}
                      onRemove={() => removeProperty(property.id)}
                      onUpdate={(values) => updateProperty(property.id, values)}
                    />
                  ))}
              </div>
              <div className="relative mb-4" ref={addPropertyRef}>
                <button onClick={() => setShowAddProperty(!showAddProperty)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-4 h-4" /><span>Add a property</span></button>
                {showAddProperty && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                    {taskDetailPropertyTypes
                      .filter((type) => !['project', 'provider', 'autoBranch'].includes(type.id))
                      .map((type) => {
                        const exists = editProperties.find((p) => p.type === type.id);
                        return (
                          <button key={type.id} onClick={() => handleAddProperty(type.id as TaskDetailProperty['type'])} disabled={!!exists} className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors", exists ? "text-muted-foreground/50 cursor-not-allowed" : "text-popover-foreground hover:bg-accent")}>
                            <type.icon className="w-4 h-4" /><div className="text-left"><div className="font-medium">{type.label}</div><div className="text-xs text-muted-foreground">{type.description}</div></div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="border-t border-border my-6" />
              <div className="mb-6"><h3 className="text-sm font-medium text-foreground mb-3">Description</h3><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full h-32 text-sm text-foreground bg-muted/30 border border-border rounded-lg p-3 outline-none resize-none placeholder:text-muted-foreground focus:border-primary/50 transition-colors" placeholder="Describe the task details..." /></div>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={handleSaveEdit} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save</button>
                <button onClick={handleCancelEdit} className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-medium text-foreground mb-2">{task.title}</h1>
              {task.description && (
                <div className="mb-6 overflow-hidden">
                  <p className={cn("text-sm text-muted-foreground break-words", !isDescriptionExpanded && "line-clamp-2")}>{task.description}</p>
                  {task.description.length > 100 && <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-xs text-primary hover:underline mt-1">{isDescriptionExpanded ? 'Show less' : 'Show more'}</button>}
                </div>
              )}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {projectName && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="w-3 h-3" />{projectName}</span>}
                <StatusBadge status={task.status as StatusId} />
                <PriorityBadge priority={task.priority} />
                <AttemptStats
                  totalAttempts={task.totalAttempts ?? 0}
                  renewCount={task.renewCount ?? 0}
                  retryCount={task.retryCount ?? 0}
                  forkCount={task.forkCount ?? 0}
                />
                <button onClick={handleStartEdit} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" />Edit</button>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Properties</h3>
                <div className="border border-border rounded-lg overflow-hidden"><div className="max-h-[72px] overflow-y-auto"><div className="divide-y divide-border">
                  <PropertyRow icon={Folder} label="Project" value={projectName} />
                  {displayProperties
                    .filter((p) => p.type !== 'status' && p.type !== 'project')
                    .map((prop) => (
                      <PropertyRow
                        key={prop.id}
                        icon={getPropertyIcon(prop.type)}
                        label={propertyTypes.find((t) => t.id === prop.type)?.label || prop.type}
                        value={getPropertyDisplayValue(prop)}
                      />
                    ))}
                  <PropertyRow icon={User} label="Assignee" value={task.assignee || undefined} />
                  <PropertyRow icon={Calendar} label="Due Date" value={task.dueDate || undefined} />
                </div></div></div>
              </div>
            </>
          )}

          <div className="border-t border-border my-6" />

          {/* Tabbed Info Panel */}
          <div>
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              {/* Tabs */}
              <button onClick={() => setActiveInfoTab('activity')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'activity' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><MessageSquare className="w-3.5 h-3.5" />Activity</button>
              <button onClick={() => setActiveInfoTab('ai-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'ai-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><Bot className="w-3.5 h-3.5" />AI Session</button>
              <button onClick={() => setActiveInfoTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><GitBranch className="w-3.5 h-3.5" />Diffs</button>
              {/* Sessions Tab with status indicator */}
              <button onClick={() => setActiveInfoTab('sessions')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'sessions' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
                {latestSession?.status === 'running' ? (
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                ) : latestSession?.status === 'queued' ? (
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                ) : latestSession?.status === 'paused' ? (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                ) : latestSession?.status === 'completed' ? (
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                ) : latestSession?.status === 'failed' ? (
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                ) : latestSession?.status === 'cancelled' ? (
                  <span className="w-2 h-2 rounded-full bg-gray-500 mr-1" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Sessions
                {sessions.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({sessions.length})</span>}
              </button>
              {/* Expand to sub-panel button */}
              <button
                onClick={() => { setSubPanelTab('chat-session'); setIsSubPanelOpen(true); }}
                className="ml-auto p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Expand to panel"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeInfoTab === 'activity' && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {(() => {
                  // Build activity timeline from existing data
                  type ActivityItem = { type: string; date: Date; data?: Record<string, unknown> };
                  const activities: ActivityItem[] = [];
                  // Task created
                  if (task.createdAt) activities.push({ type: 'task_created', date: new Date(task.createdAt) });
                  // Branch created (use branchCreatedAt field)
                  if (task.branchName && task.branchCreatedAt) activities.push({ type: 'branch_created', date: new Date(task.branchCreatedAt), data: { branch: task.branchName } });
                  // Sessions
                  sessions.forEach(s => {
                    activities.push({ type: 'session_started', date: new Date(s.createdAt), data: { attempt: s.attemptNumber, mode: s.resumeMode, status: s.status } });
                    if (s.status === 'completed' && s.endedAt) activities.push({ type: 'session_completed', date: new Date(s.endedAt), data: { attempt: s.attemptNumber } });
                    if (s.status === 'failed' && s.endedAt) activities.push({ type: 'session_failed', date: new Date(s.endedAt), data: { attempt: s.attemptNumber } });
                  });
                  // Git commit approval events
                  gitCommitApprovals.forEach(approval => {
                    activities.push({ type: 'commit_approval_requested', date: new Date(approval.createdAt), data: { message: approval.commitMessage, files: approval.filesChanged.length, id: approval.id } });
                    if (approval.resolvedAt && approval.status === 'approved') {
                      activities.push({ type: 'commit_approved', date: new Date(approval.resolvedAt), data: { message: approval.commitMessage, sha: approval.commitSha } });
                    } else if (approval.resolvedAt && approval.status === 'rejected') {
                      activities.push({ type: 'commit_rejected', date: new Date(approval.resolvedAt), data: { message: approval.commitMessage } });
                    }
                  });
                  // Task completed
                  if (task.status === 'done' && task.completedAt) activities.push({ type: 'task_completed', date: new Date(task.completedAt) });
                  // Sort newest first
                  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
                  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  if (activities.length === 0) return <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><MessageSquare className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No activity yet</p></div>;
                  return activities.map((act, idx) => {
                    if (act.type === 'task_created') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3 h-3 text-muted-foreground" /></div><div><p className="text-foreground"><span className="font-medium">Task created</span></p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'branch_created') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-blue-500" /></div><div><p className="text-foreground"><span className="font-medium">Branch created:</span> {String(act.data?.branch)}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'session_started') { const mode = act.data?.mode as string | undefined; return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3 h-3 text-purple-500" /></div><div><p className="text-foreground"><span className="font-medium">Session started</span> #{act.data?.attempt}{mode ? ` (${mode})` : ''}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>; }
                    if (act.type === 'session_completed') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3 h-3 text-green-500" /></div><div><p className="text-foreground"><span className="font-medium">Session completed</span> #{act.data?.attempt}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'session_failed') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><X className="w-3 h-3 text-red-500" /></div><div><p className="text-foreground"><span className="font-medium">Session failed</span> #{act.data?.attempt}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'commit_approval_requested') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-yellow-500" /></div><div><p className="text-foreground"><span className="font-medium">Commit approval requested</span></p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{String(act.data?.message || 'No message')}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'commit_approved') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-green-500" /></div><div><p className="text-foreground"><span className="font-medium">Commit approved</span></p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{String(act.data?.message || 'No message')}</p>{act.data?.sha && <p className="text-xs text-muted-foreground font-mono">{String(act.data.sha).slice(0, 7)}</p>}<p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'commit_rejected') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><X className="w-3 h-3 text-red-500" /></div><div><p className="text-foreground"><span className="font-medium">Commit rejected</span></p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{String(act.data?.message || 'No message')}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    if (act.type === 'task_completed') return <div key={idx} className="flex items-start gap-3 text-sm"><div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3 h-3 text-green-500" /></div><div><p className="text-foreground"><span className="font-medium">Task completed</span></p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div></div>;
                    return null;
                  });
                })()}
              </div>
            )}

            {activeInfoTab === 'ai-session' && (() => {
              // Combine API messages + realtime messages, deduplicating by content
              // (realtime messages may duplicate API messages after backend saves)
              const apiContentSet = new Set(sessionMessages.map(m => m.content));
              const uniqueRealtimeMessages = realtimeMessages.filter(m => !apiContentSet.has(m.content));
              const allMessages = [...sessionMessages, ...uniqueRealtimeMessages].sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : Date.now();
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : Date.now();
                return timeA - timeB; // Oldest first (chronological order)
              });
              const hasMessages = allMessages.length > 0 || currentAssistantMessage;

              return (
              <div
                ref={aiSessionContainerRef}
                className="space-y-4 max-h-[300px] overflow-y-auto"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
                }}
              >
                {/* Session Starting Indicator */}
                {isStartingSession && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Starting session...</span>
                  </div>
                )}

                {/* Pending Approval Requests */}
                {pendingApprovals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={() => handleApprove(approval.id)}
                    onReject={() => handleReject(approval.id)}
                    isProcessing={processingApproval === approval.id}
                  />
                ))}
                {!latestSession ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bot className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No AI session for this task</p>
                    <p className="text-xs mt-1">Start the task to begin an AI session</p>
                  </div>
                ) : !hasMessages && pendingApprovals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : allMessages.map((message) => (
                  message.role === 'user' ? (
                    <div key={message.id} className="flex justify-end mb-4"><div className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground max-w-[80%]">{message.content}</div></div>
                  ) : (
                    <div key={message.id} className="mb-6">
                      <MarkdownMessage content={message.content} className="text-sm text-foreground" />
                      {message.files && message.files.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground hover:bg-muted/50 transition-colors">
                              <FileCode className="w-3 h-3" /><span className="flex-1">{file.name}</span>
                              {file.additions !== undefined && <span className="text-green-500">+{file.additions}</span>}
                              {file.deletions !== undefined && file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.commands && message.commands.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.commands.map((cmd, idx) => {
                            const cmdKey = `${message.id}-${idx}`;
                            const isExpanded = expandedCommands.has(cmdKey);
                            const hasInput = cmd.input && Object.keys(cmd.input).length > 0;
                            return (
                              <div key={idx} className="bg-muted/30 rounded text-xs font-mono overflow-hidden">
                                <button
                                  onClick={() => hasInput && toggleCommand(cmdKey)}
                                  className={cn("w-full flex items-center gap-2 px-2 py-1", hasInput && "hover:bg-muted/50 cursor-pointer")}
                                >
                                  {hasInput ? (
                                    isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  ) : (
                                    <Terminal className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <span className="flex-1 text-foreground text-left">{cmd.cmd}</span>
                                  {cmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                </button>
                                {isExpanded && cmd.input && (
                                  <div className="px-3 py-2 border-t border-border/50 bg-background/50 space-y-1">
                                    {/* File path - Read, Write, Edit, Glob */}
                                    {'file_path' in cmd.input && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <FileCode className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{String(cmd.input.file_path)}</span>
                                      </div>
                                    )}
                                    {/* Query - WebSearch */}
                                    {'query' in cmd.input && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Globe className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{String(cmd.input.query)}</span>
                                      </div>
                                    )}
                                    {/* Command - Bash */}
                                    {'command' in cmd.input && (
                                      <div className="flex items-start gap-2 text-muted-foreground">
                                        <Terminal className="w-3 h-3 shrink-0 mt-0.5" />
                                        <code className="text-[10px] break-all">{String(cmd.input.command)}</code>
                                      </div>
                                    )}
                                    {/* Pattern - Grep, Glob */}
                                    {'pattern' in cmd.input && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-[10px] font-medium">Pattern:</span>
                                        <code className="text-[10px]">{String(cmd.input.pattern)}</code>
                                      </div>
                                    )}
                                    {/* URL - WebFetch */}
                                    {'url' in cmd.input && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Globe className="w-3 h-3 shrink-0" />
                                        <span className="truncate text-[10px]">{String(cmd.input.url)}</span>
                                      </div>
                                    )}
                                    {/* Content - Write, Edit with action buttons */}
                                    {'content' in cmd.input && (
                                      <div className="mt-1">
                                        <div className="flex items-center justify-end gap-1 mb-1">
                                          <button
                                            onClick={() => navigator.clipboard.writeText(String(cmd.input.content))}
                                            className="p-1 rounded hover:bg-muted transition-colors"
                                            title="Copy content"
                                          >
                                            <Copy className="w-3 h-3 text-muted-foreground" />
                                          </button>
                                          <button
                                            onClick={() => setContentModalData({ filePath: 'file_path' in cmd.input ? String(cmd.input.file_path) : 'Content', content: String(cmd.input.content) })}
                                            className="p-1 rounded hover:bg-muted transition-colors"
                                            title="View in modal"
                                          >
                                            <Eye className="w-3 h-3 text-muted-foreground" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              const filePath = 'file_path' in cmd.input ? String(cmd.input.file_path) : 'Content';
                                              openFileAsTab(filePath, String(cmd.input.content));
                                            }}
                                            className="p-1 rounded hover:bg-muted transition-colors"
                                            title="Open in new tab"
                                          >
                                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                          </button>
                                        </div>
                                        <pre className="p-2 bg-muted/50 rounded text-[10px] max-h-[120px] overflow-auto whitespace-pre-wrap text-foreground/80">
                                          {String(cmd.input.content).slice(0, 500)}{String(cmd.input.content).length > 500 ? '...' : ''}
                                        </pre>
                                      </div>
                                    )}
                                    {/* Todos - TodoWrite */}
                                    {'todos' in cmd.input && Array.isArray(cmd.input.todos) && (
                                      <div className="space-y-1">
                                        {(cmd.input.todos as Array<{content?: string; status?: string}>).slice(0, 5).map((todo, i) => (
                                          <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className={cn("w-2 h-2 rounded-full", todo.status === 'completed' ? 'bg-green-500' : todo.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400')} />
                                            <span className="truncate">{todo.content}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {/* Fallback: show raw JSON if no known fields */}
                                    {!('file_path' in cmd.input || 'query' in cmd.input || 'command' in cmd.input || 'pattern' in cmd.input || 'url' in cmd.input || 'content' in cmd.input || 'todos' in cmd.input) && (
                                      <pre className="text-[10px] text-muted-foreground/80 max-h-[80px] overflow-auto whitespace-pre-wrap">
                                        {JSON.stringify(cmd.input, null, 2).slice(0, 300)}
                                      </pre>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {message.todos && message.todos.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {message.todos.map((todo, idx) => (
                            <div key={idx} className="flex items-start gap-2 px-2 py-1 text-xs">
                              {todo.checked ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                              <span className={cn("flex-1", todo.checked ? "text-muted-foreground line-through" : "text-foreground")}>{todo.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
                {/* Streaming assistant message (same as FullView) */}
                {currentAssistantMessage && (
                  <div className="mb-6">
                    <MarkdownMessage content={currentAssistantMessage} className="text-sm text-foreground" />
                    <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse mt-1" />
                  </div>
                )}
                {/* Current tool in use (same as FullView) */}
                {currentToolUse && (
                  <div className="mb-4 bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Wrench className="w-3.5 h-3.5 animate-pulse" />
                      <span className="font-medium">{currentToolUse.name}</span>
                    </div>
                    {currentToolUse.input && Object.keys(currentToolUse.input).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground/80 max-h-[80px] overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(currentToolUse.input, null, 2).slice(0, 500)}
                      </pre>
                    )}
                  </div>
                )}
                {/* Waiting indicator (same as FullView) */}
                {isWaitingForResponse && !currentAssistantMessage && !currentToolUse && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>AI is thinking...</span>
                  </div>
                )}
                {isTyping && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><div className="flex gap-1"><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div><span>Thinking...</span></div>}
                {/* Connection indicator at bottom - prevents jump when appearing */}
                {isSessionLive && !isStartingSession && (
                  <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs", isWsConnected ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600")}>
                    <span className={cn("w-2 h-2 rounded-full", isWsConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
                    {isWsConnected ? "Connected - Ready for chat" : "Connecting to session..."}
                  </div>
                )}
              </div>
              );
            })()}

            {activeInfoTab === 'diffs' && (
              <div className="space-y-3">
                {/* Git Status Card */}
                <GitStatusCard gitStatus={gitStatus} />

                {!latestSession ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <GitBranch className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No diffs available</p>
                    <p className="text-xs mt-1">Start the task to see code changes</p>
                  </div>
                ) : sessionDiffs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileCode className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No code changes yet</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <span>{sessionDiffs.length} file{sessionDiffs.length > 1 ? 's' : ''} changed,</span>
                      <span className="text-green-500">+{sessionDiffs.reduce((sum, d) => sum + d.additions, 0)}</span>
                      <span className="text-red-500">-{sessionDiffs.reduce((sum, d) => sum + d.deletions, 0)}</span>
                    </div>
                    {sessionDiffs.map((diff) => (
                  <div key={diff.id} className={cn("border rounded-lg overflow-hidden", diffApprovals[diff.id] === 'approved' && "border-green-500/50", diffApprovals[diff.id] === 'rejected' && "border-red-500/50", !diffApprovals[diff.id] && "border-border")}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                      <button onClick={() => handleDiffFileClick(diff.id)} className="flex items-center gap-2 flex-1 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors cursor-pointer">
                        <FileCode className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">Rejected</span>}
                        <span className="text-xs text-green-500 ml-auto">+{diff.additions}</span>
                        {diff.deletions > 0 && <span className="text-xs text-red-500">-{diff.deletions}</span>}
                        <ExternalLink className="w-3 h-3 text-muted-foreground ml-2" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleApproveDiff(diff.id); }} className={cn("p-1.5 rounded transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500/20 text-green-500" : "hover:bg-green-500/10 text-muted-foreground hover:text-green-500")} title="Approve changes"><ThumbsUp className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleRejectDiff(diff.id); }} className={cn("p-1.5 rounded transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500/20 text-red-500" : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500")} title="Reject changes"><ThumbsDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto bg-background">
                      {diff.chunks.map((chunk, chunkIdx) => (
                        <div key={chunkIdx} className="font-mono text-xs">
                          <div className="px-3 py-1 bg-muted/30 text-muted-foreground border-b border-border/50">{chunk.header}</div>
                          <div>{chunk.lines.map((line, lineIdx) => (
                            <div key={lineIdx} className={cn("px-3 py-0.5 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'remove' && "bg-red-500/10")}>
                              <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                              <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'remove' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                              <span className={cn("flex-1", line.type === 'add' && "text-green-400", line.type === 'remove' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                            </div>
                          ))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeInfoTab === 'sessions' && (
              <div className="space-y-3">
                {/* Session Actions - show when session is not running/queued */}
                {latestSession && ['failed', 'completed', 'cancelled', 'paused'].includes(latestSession.status) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      latestSession.status === 'failed' && "bg-red-500/20 text-red-500",
                      latestSession.status === 'completed' && "bg-green-500/20 text-green-600",
                      latestSession.status === 'cancelled' && "bg-gray-500/20 text-gray-500",
                      latestSession.status === 'paused' && "bg-yellow-500/20 text-yellow-600"
                    )}>
                      {latestSession.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex-1">
                      {latestSession.status === 'paused' ? 'Session paused' : 'Session ended'}
                    </span>
                    <button
                      onClick={() => handleStartSessionWithMode('retry')}
                      disabled={isStartingSession}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
                      title="Resume with context"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />Retry
                    </button>
                    <button
                      onClick={() => handleStartSessionWithMode('renew')}
                      disabled={isStartingSession}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
                      title="Fresh start"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />Renew
                    </button>
                    <button
                      onClick={() => handleStartSessionWithMode('fork')}
                      disabled={isStartingSession}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      title="New with conversation"
                    >
                      <Copy className="w-3.5 h-3.5" />Fork
                    </button>
                  </div>
                )}

                {/* Task-level Stats - always show when there are sessions */}
                {sessions.length > 0 && (
                  <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/20 text-xs">
                    <span className="text-muted-foreground">Stats:</span>
                    <span className="text-foreground font-medium">{task.totalAttempts ?? sessions.length} attempts</span>
                    {(task.renewCount ?? 0) > 0 && <span className="text-blue-500">{task.renewCount} renew</span>}
                    {(task.retryCount ?? 0) > 0 && <span className="text-yellow-500">{task.retryCount} retry</span>}
                    {(task.forkCount ?? 0) > 0 && <span className="text-purple-500">{task.forkCount} fork</span>}
                  </div>
                )}

                {/* Sessions List */}
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No sessions yet</p>
                    <p className="text-xs mt-1">Start the task to begin a session</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground px-1">
                      {sessions.length} session{sessions.length !== 1 ? 's' : ''} • Latest first
                    </div>
                    {[...sessions]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((session, idx) => (
                        <div
                          key={session.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            idx === 0 && session.status === 'queued' && "border-gray-500/30 bg-gray-500/5",
                            idx === 0 && session.status === 'running' && "border-blue-500/50 bg-blue-500/5",
                            idx === 0 && session.status === 'paused' && "border-yellow-500/30 bg-yellow-500/5",
                            idx === 0 && session.status === 'completed' && "border-green-500/30 bg-green-500/5",
                            idx === 0 && session.status === 'failed' && "border-red-500/30 bg-red-500/5",
                            idx === 0 && session.status === 'cancelled' && "border-gray-500/30 bg-gray-500/5",
                            idx !== 0 && "border-border bg-muted/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {/* Status Icon */}
                            {session.status === 'queued' ? (
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                            ) : session.status === 'running' ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                            ) : session.status === 'paused' ? (
                              <Pause className="w-3.5 h-3.5 text-yellow-500" />
                            ) : session.status === 'completed' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : session.status === 'failed' ? (
                              <X className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            {/* Session ID */}
                            <span className="text-xs font-mono text-muted-foreground">
                              {session.id.slice(0, 8)}...
                            </span>
                            {/* Attempt # */}
                            <span className="text-xs text-foreground font-medium">
                              #{session.attemptNumber ?? idx + 1}
                            </span>
                            {/* Resume Mode Badge */}
                            {session.resumeMode && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                session.resumeMode === 'retry' && "bg-yellow-500/20 text-yellow-600",
                                session.resumeMode === 'renew' && "bg-blue-500/20 text-blue-600",
                                session.resumeMode === 'fork' && "bg-purple-500/20 text-purple-600"
                              )}>
                                {session.resumeMode}
                              </span>
                            )}
                            {/* Status */}
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto",
                              session.status === 'queued' && "bg-gray-500/20 text-gray-500",
                              session.status === 'running' && "bg-blue-500/20 text-blue-500",
                              session.status === 'paused' && "bg-yellow-500/20 text-yellow-600",
                              session.status === 'completed' && "bg-green-500/20 text-green-600",
                              session.status === 'failed' && "bg-red-500/20 text-red-500",
                              session.status === 'cancelled' && "bg-gray-500/20 text-gray-500"
                            )}>
                              {session.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-4">
                            <span>
                              {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {session.resumedFromSessionId && (
                              <span className="flex items-center gap-1">
                                <Copy className="w-2.5 h-2.5" />
                                from {session.resumedFromSessionId.slice(0, 6)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
          )}
        </div>

        {/* Chat Input Footer - only show when task is loaded */}
        {task && (
        <div className="p-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl border p-3 transition-colors relative",
              isDragOver
                ? "border-primary border-dashed bg-primary/10"
                : isWsConnected && isSessionLive
                  ? "border-green-500/30 bg-green-500/5 focus-within:border-green-500/50"
                  : "border-border bg-muted/30 focus-within:border-primary/50"
            )}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10">
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <Paperclip className="w-5 h-5" />
                  Drop files here
                </div>
              </div>
            )}
            <div className="mb-2">
              <button
                onClick={() => { setChatInput(chatInput + '@'); setShowContextPicker(true); chatInputRef.current?.focus(); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
              >
                <AtSign className="w-3.5 h-3.5" />Add context
              </button>
            </div>
            {/* Attached Files Display */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachedFiles.map((file, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-foreground">
                    <FileCode className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">{file}</span>
                    <button onClick={() => removeAttachedFile(idx)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {/* Input with @ context picker */}
            <div className="relative mb-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={handleChatInputChange}
                onKeyDown={(e) => { handleContextPickerKeyDown(e); if (!showContextPicker) handleChatKeyDown(e); }}
                onPaste={handlePaste}
                placeholder={isSessionLive && isWsConnected ? "Type @ to add context..." : "Type @ to add files..."}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                disabled={isTyping || isWaitingForResponse}
              />
              {/* @ Context Picker Dropdown */}
              {showContextPicker && filteredFiles.length > 0 && (
                <div
                  ref={contextPickerRef}
                  className="absolute bottom-full left-0 mb-1 w-72 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg py-1 z-30"
                >
                  <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Files</div>
                  {filteredFiles.slice(0, 8).map((file, idx) => (
                    <button
                      key={file}
                      onClick={() => selectContextFile(file)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                        idx === contextPickerIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      )}
                    >
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{file}</span>
                    </button>
                  ))}
                  {filteredFiles.length > 8 && (
                    <div className="px-3 py-1 text-xs text-muted-foreground">+{filteredFiles.length - 8} more</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {/* File Attachment */}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </button>
                {/* Model Selector */}
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      selectedModel !== 'default' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {selectedModel === 'default' ? 'Default' : selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-32 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                      {(['default', 'haiku', 'sonnet', 'opus'] as const).map((model) => (
                        <button
                          key={model}
                          onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }}
                          className={cn(
                            "w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors",
                            selectedModel === model ? "text-primary font-medium" : "text-popover-foreground"
                          )}
                        >
                          {model === 'default' ? 'Default' : model.charAt(0).toUpperCase() + model.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Web Search Toggle */}
                <button
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    webSearchEnabled ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={webSearchEnabled ? "Web search enabled" : "Web search disabled"}
                >
                  <Globe className={cn("w-3.5 h-3.5", webSearchEnabled && "text-blue-500")} />
                  Web
                </button>
              </div>
              <div className="flex items-center gap-1">
                {/* Permission Mode Selector */}
                <div className="relative" ref={permissionDropdownRef}>
                  <button
                    onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      chatPermissionMode === 'default' && "text-muted-foreground hover:text-foreground hover:bg-muted",
                      chatPermissionMode === 'acceptEdits' && "text-yellow-500 bg-yellow-500/10",
                      chatPermissionMode === 'bypassPermissions' && "text-red-500 bg-red-500/10"
                    )}
                    title={`Permission: ${chatPermissionMode}`}
                  >
                    {chatPermissionMode === 'default' && <ShieldAlert className="w-4 h-4" />}
                    {chatPermissionMode === 'acceptEdits' && <Pencil className="w-4 h-4" />}
                    {chatPermissionMode === 'bypassPermissions' && <Zap className="w-4 h-4" />}
                  </button>
                  {showPermissionDropdown && (
                    <div className="absolute bottom-full right-0 mb-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Permission Mode</div>
                      <button
                        onClick={() => { setChatPermissionMode('default'); setShowPermissionDropdown(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'default' && "text-primary font-medium")}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />Default (Ask)
                      </button>
                      <button
                        onClick={() => { setChatPermissionMode('acceptEdits'); setShowPermissionDropdown(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'acceptEdits' && "text-yellow-500 font-medium")}
                      >
                        <Pencil className="w-3.5 h-3.5" />Accept Edits
                      </button>
                      <button
                        onClick={() => { setChatPermissionMode('bypassPermissions'); setShowPermissionDropdown(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors", chatPermissionMode === 'bypassPermissions' && "text-red-500 font-medium")}
                      >
                        <Zap className="w-3.5 h-3.5" />Bypass All
                      </button>
                    </div>
                  )}
                </div>
                {/* Show Cancel button when waiting for response in running session */}
                {isWaitingForResponse && isSessionLive ? (
                <button onClick={() => { sendCancel(); setIsWaitingForResponse(false); setCurrentAssistantMessage(''); }} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium"><X className="w-3.5 h-3.5" />Cancel</button>
              ) : isSessionLive && isWsConnected ? (
                /* Show Send button when connected to running session */
                <button onClick={() => sendMessage(chatInput)} disabled={!chatInput.trim() || isWaitingForResponse} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" />Send
                </button>
              ) : task.status === 'not-started' ? (
                <button onClick={handleStartTask} disabled={isUpdating} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"><Play className="w-3.5 h-3.5" />Start</button>
              ) : task.status === 'in-progress' && !isSessionLive ? (
                /* Task in-progress but no running session - show Resume options */
                <button onClick={() => handleStartSessionWithMode('retry')} disabled={isStartingSession} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50">
                  {isStartingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}Resume
                </button>
              ) : task.status === 'in-progress' ? (
                <button onClick={handleCancelTask} disabled={isUpdating} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium disabled:opacity-50"><X className="w-3.5 h-3.5" />Cancel</button>
              ) : (
                <button onClick={handleContinueTask} disabled={isUpdating} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"><Play className="w-3.5 h-3.5" />Continue</button>
              )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Sub-Panel for expanded file view */}
      {isSubPanelOpen && (
        <>
          <div className="fixed top-0 left-0 bottom-0 z-[55] bg-black/20" style={{ right: '800px' }} onClick={handleCloseSubPanel} />
          <div ref={subPanelRef} className={cn("fixed top-0 right-0 z-[60] h-full w-[800px]", "glass-strong border-l-2 border-border/50", "flex flex-col", "transition-transform duration-300 ease-in-out", isSubPanelOpen ? "translate-x-0" : "translate-x-full")}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">File Details</span></div>
              <button onClick={handleCloseSubPanel} className="p-1 rounded hover:bg-muted transition-colors" title="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
              <button onClick={() => setSubPanelTab('chat-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'chat-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><Bot className="w-3.5 h-3.5" />Chat Session</button>
              <button onClick={() => setSubPanelTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}><GitBranch className="w-3.5 h-3.5" />Diffs</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {subPanelTab === 'chat-session' && (() => {
                // Combine API messages + realtime messages (same as main AI Session tab)
                const apiContentSet = new Set(sessionMessages.map(m => m.content));
                const uniqueRealtimeMessages = realtimeMessages.filter(m => !apiContentSet.has(m.content));
                const allMessages = [...sessionMessages, ...uniqueRealtimeMessages].sort((a, b) => {
                  const timeA = a.timestamp ? new Date(a.timestamp).getTime() : Date.now();
                  const timeB = b.timestamp ? new Date(b.timestamp).getTime() : Date.now();
                  return timeA - timeB; // Oldest first (chronological order)
                });
                const hasMessages = allMessages.length > 0 || currentAssistantMessage;

                return (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">AI Session Messages</h3>
                    {!hasMessages ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    ) : (
                      <>
                        {allMessages.map((message) => (
                          message.role === 'user' ? (
                            <div key={message.id} className="flex justify-end mb-4"><div className="bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground max-w-[80%]">{message.content}</div></div>
                          ) : (
                            <div key={message.id} className="mb-6"><MarkdownMessage content={message.content} className="text-sm text-foreground" /></div>
                          )
                        ))}

                        {/* Show streaming assistant message */}
                        {currentAssistantMessage && (
                          <div className="mb-6">
                            <MarkdownMessage content={currentAssistantMessage} className="text-sm text-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
              {subPanelTab === 'diffs' && selectedDiffFile && (
                <div>
                  {sessionDiffs.filter(diff => diff.id === selectedDiffFile).map((diff) => (
                    <div key={diff.id}>
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                        <FileCode className="w-5 h-5 text-muted-foreground" /><span className="text-base font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 font-medium">✓ Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-600 font-medium">✗ Rejected</span>}
                        <span className="text-sm text-green-500 ml-auto">+{diff.additions}</span>
                        {diff.deletions > 0 && <span className="text-sm text-red-500">-{diff.deletions}</span>}
                        <div className="flex items-center gap-2 ml-2">
                          <button onClick={() => handleApproveDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500 text-white" : "bg-green-500/10 text-green-600 hover:bg-green-500/20")}><ThumbsUp className="w-4 h-4" />Approve</button>
                          <button onClick={() => handleRejectDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500 text-white" : "bg-red-500/10 text-red-600 hover:bg-red-500/20")}><ThumbsDown className="w-4 h-4" />Reject</button>
                        </div>
                      </div>
                      <div className="border border-border rounded-lg overflow-hidden">
                        {diff.chunks.map((chunk, chunkIdx) => (
                          <div key={chunkIdx} className="font-mono text-xs">
                            <div className="px-3 py-2 bg-muted/30 text-muted-foreground border-b border-border/50 sticky top-0">{chunk.header}</div>
                            <div className="bg-background">
                              {chunk.lines.map((line, lineIdx) => (
                                <div key={lineIdx} className={cn("px-3 py-1 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'remove' && "bg-red-500/10")}>
                                  <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                                  <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'remove' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                                  <span className={cn("flex-1 break-all", line.type === 'add' && "text-green-400", line.type === 'remove' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Content Modal for Write tool preview */}
      {contentModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setContentModalData(null)}>
          <div className="bg-background border border-border rounded-lg shadow-2xl w-[80vw] max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground truncate">{contentModalData.filePath}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => navigator.clipboard.writeText(contentModalData.content)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Copy">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => setContentModalData(null)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Close">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90">{contentModalData.content}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
