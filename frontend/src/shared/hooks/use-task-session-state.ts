/**
 * Combined hook for task session state
 * Manages session data, WebSocket connection, and streaming state
 * ENHANCED: Now covers ALL streaming and WebSocket state for parent components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLatestSession } from './use-latest-session';
import { useSessionWebSocket, type ToolUseBlock } from './use-session-websocket';
import { useSessions, useTaskMessages } from './use-sessions-query';
import { sessionsApi } from '@/adapters/api/sessions-api';
import type { ApprovalRequest } from '@/adapters/api/sessions-api';
import type { ChatMessage } from '@/shared/types/task-detail-types';

// Streaming tool command type (for WebSocket streaming)
export interface StreamingToolCommand {
  id: string;
  name: string;
  input: Record<string, unknown>;
  timestamp: Date;
}

export interface UseTaskSessionStateOptions {
  taskId: string;
}

export interface UseTaskSessionStateReturn {
  // Session data
  latestSession: ReturnType<typeof useLatestSession>;
  sessions: ReturnType<typeof useSessions>['data'];

  // Chat messages
  chatMessages: ChatMessage[];

  // WebSocket state
  isWsConnected: boolean;
  wsSessionStatus: string | null;

  // Real-time streaming state
  realtimeMessages: ChatMessage[];
  setRealtimeMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentAssistantMessage: string;
  setCurrentAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  currentToolUse: ToolUseBlock | null;
  setCurrentToolUse: React.Dispatch<React.SetStateAction<ToolUseBlock | null>>;
  streamingToolUses: StreamingToolCommand[];
  setStreamingToolUses: React.Dispatch<React.SetStateAction<StreamingToolCommand[]>>;
  isWaitingForResponse: boolean;
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>;

  // Message buffers for delta streaming
  setMessageBuffers: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Refs for streaming state
  streamingBufferRef: React.MutableRefObject<string>;
  chatMessagesRef: React.MutableRefObject<ChatMessage[]>;
  processedMessageIds: React.MutableRefObject<Set<string>>;

  // Approvals
  pendingApprovals: ApprovalRequest[];
  setPendingApprovals: React.Dispatch<React.SetStateAction<ApprovalRequest[]>>;

  // WebSocket actions
  sendUserInput: (content: string, options?: { model?: string; permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'; files?: string[]; disableWebTools?: boolean }) => void;
  sendCancel: () => void;
  sendApprovalResponse: (requestId: string, approved: boolean) => void;

  // Loading states
  isLoading: boolean;
  isSessionLive: boolean;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;

  // Realtime diffs from WebSocket
  realtimeDiffs: Array<{ id: string; filePath: string; operation: string; status: string }>;
}

export function useTaskSessionState({
  taskId,
}: UseTaskSessionStateOptions): UseTaskSessionStateReturn {
  const latestSession = useLatestSession(taskId);
  const { data: sessions = [] } = useSessions({ taskId });
  const { data: apiMessages = [] } = useTaskMessages(taskId, 200);

  // State management
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [wsSessionStatus, setWsSessionStatus] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Real-time WebSocket chat state
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [currentToolUse, setCurrentToolUse] = useState<ToolUseBlock | null>(null);
  const [streamingToolUses, setStreamingToolUses] = useState<StreamingToolCommand[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [, setMessageBuffers] = useState<Record<string, string>>({});
  const [realtimeDiffs, setRealtimeDiffs] = useState<Array<{ id: string; filePath: string; operation: string; status: string }>>([]);

  // Refs for streaming state (prevent stale closures)
  const streamingBufferRef = useRef<string>('');
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // WebSocket connection with streaming handlers
  const {
    isConnected: isWsConnected,
    sendUserInput,
    sendCancel,
    sendApprovalResponse,
  } = useSessionWebSocket({
    sessionId: latestSession?.id || '',
    enabled: !!latestSession && latestSession.status === 'running',
    onMessage: useCallback((text: string, isFinal: boolean, messageId?: string) => {
      if (isFinal) {
        // Message complete - move from streaming to realtime
        if (streamingBufferRef.current) {
          const assistantMsg: ChatMessage = {
            id: messageId || `assistant-${Date.now()}`,
            role: 'assistant',
            content: streamingBufferRef.current,
            timestamp: new Date(),
          };
          setRealtimeMessages(prev => [...prev, assistantMsg]);
          streamingBufferRef.current = '';
          setCurrentAssistantMessage('');
        }
      } else {
        // Streaming - accumulate text
        streamingBufferRef.current += text;
        setCurrentAssistantMessage(streamingBufferRef.current);
      }
    }, []),
    onToolUse: useCallback((tool: ToolUseBlock) => {
      setCurrentToolUse(tool);
      setStreamingToolUses(prev => [...prev, {
        id: tool.id,
        name: tool.name,
        input: tool.input,
        timestamp: new Date(),
      }]);
    }, []),
    onStatus: useCallback((status: string) => {
      setWsSessionStatus(status);
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        setIsWaitingForResponse(false);
      }
    }, []),
    onDiffPreview: useCallback((data: { id: string; filePath: string; operation: 'edit' | 'write' | 'delete'; content: string }) => {
      setRealtimeDiffs(prev => {
        const idx = prev.findIndex(d => d.id === data.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...data, status: 'pending' };
          return updated;
        }
        return [...prev, { ...data, status: 'pending' }];
      });
    }, []),
  });

  // Fetch approvals when session changes
  useEffect(() => {
    if (!latestSession?.id) return;

    sessionsApi.getPendingApprovals(latestSession.id)
      .then(res => setPendingApprovals(res.approvals))
      .catch(() => setPendingApprovals([]));
  }, [latestSession?.id]);

  // Convert API messages to chat format
  const chatMessages: ChatMessage[] = apiMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: (msg.blocks as Array<{ content: string }>)?.map(b => b.content).join('') || '',
    timestamp: new Date(msg.timestamp),
  }));

  // Keep chatMessagesRef in sync
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Determine if session is live
  const isSessionLive = isWsConnected && latestSession?.status === 'running';

  return {
    latestSession,
    sessions,
    chatMessages,
    isWsConnected,
    wsSessionStatus,
    realtimeMessages,
    setRealtimeMessages,
    currentAssistantMessage,
    setCurrentAssistantMessage,
    currentToolUse,
    setCurrentToolUse,
    streamingToolUses,
    setStreamingToolUses,
    isWaitingForResponse,
    setIsWaitingForResponse,
    setMessageBuffers,
    streamingBufferRef,
    chatMessagesRef,
    processedMessageIds,
    pendingApprovals,
    setPendingApprovals,
    sendUserInput,
    sendCancel,
    sendApprovalResponse,
    isLoading: !sessions,
    isSessionLive,
    isTyping,
    setIsTyping,
    realtimeDiffs,
  };
}
