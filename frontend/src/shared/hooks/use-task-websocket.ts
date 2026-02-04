import { useQueryClient } from '@tanstack/react-query';
import { useSessionWebSocket } from './use-session-websocket';
import { sessionKeys } from './use-sessions-query';
import type { ChatMessage, ToolCommand } from '@/shared/types';
import type { ApprovalRequest } from '@/adapters/api/sessions-api';
import type { ToolUseBlock } from './use-session-websocket';

interface UseTaskWebSocketParams {
  sessionId: string;
  isSessionLive: boolean;
  chatMessagesRef: React.MutableRefObject<ChatMessage[]>;
  streamingBufferRef: React.MutableRefObject<string>;
  processedMessageIds: React.MutableRefObject<Set<string>>;
  setRealtimeMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCurrentAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  setCurrentToolUse: React.Dispatch<React.SetStateAction<ToolUseBlock | null>>;
  setStreamingToolUses: React.Dispatch<React.SetStateAction<ToolCommand[]>>;
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setWsSessionStatus: React.Dispatch<React.SetStateAction<string | null>>;
  setPendingApprovals: React.Dispatch<React.SetStateAction<ApprovalRequest[]>>;
  setMessageBuffers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDiffPreview?: (data: { id: string; filePath: string; operation: 'edit' | 'write' | 'delete'; content: string }) => void;
}

export function useTaskWebSocket({
  sessionId,
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
  onDiffPreview,
}: UseTaskWebSocketParams) {
  const queryClient = useQueryClient();

  return useSessionWebSocket({
    sessionId,
    enabled: isSessionLive,
    onMessage: (text, isFinal, messageId) => {
      if (isFinal) {
        const finalContent = streamingBufferRef.current + (text || '');
        const msgId = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (finalContent && !processedMessageIds.current.has(msgId)) {
          const apiHasMessage = chatMessagesRef.current.some(m => m.id === msgId);
          if (!apiHasMessage) {
            setRealtimeMessages(prev => {
              if (prev.some(m => m.id === msgId)) return prev;
              return [...prev, {
                id: msgId,
                role: 'assistant',
                content: finalContent,
                commands: undefined,
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
      setWsSessionStatus(status);
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        setCurrentToolUse(null);
        setIsWaitingForResponse(false);
        if (sessionId) {
          queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) });
          queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
          queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        }
      }
    },
    onApprovalRequired: (data) => {
      setPendingApprovals(prev => [...prev, {
        id: data.requestId,
        sessionId,
        type: 'tool',
        payload: { toolName: data.toolName, toolInput: data.toolInput as ApprovalRequest['payload']['toolInput'] },
        toolCategory: data.category,
        status: 'pending',
        timeoutAt: new Date(data.timeoutAt).toISOString(),
        decidedAt: null,
        decidedBy: null,
        createdAt: new Date().toISOString(),
      }]);
    },
    onDiffPreview,
    onError: (message) => {
      console.error('WebSocket error:', message);
      setIsWaitingForResponse(false);
    },
    onDisconnected: () => {
      if (streamingBufferRef.current) {
        setRealtimeMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: streamingBufferRef.current }]);
        streamingBufferRef.current = '';
        setCurrentAssistantMessage('');
      }
      setCurrentToolUse(null);
      setIsWaitingForResponse(false);
    },
    onDelta: (messageId, text, offset) => {
      // Reset buffer on new message (offset 0 indicates start of new message)
      if (offset === 0) {
        streamingBufferRef.current = '';
      }

      // Append to streaming buffer (single source of truth)
      streamingBufferRef.current += text;

      // Update display immediately
      setCurrentAssistantMessage(streamingBufferRef.current);

      // Track per-message content for dedup
      setMessageBuffers(prev => ({
        ...prev,
        [messageId]: streamingBufferRef.current,
      }));
    },
    onStreamingBuffer: (messageId, content) => {
      setMessageBuffers(prev => ({
        ...prev,
        [messageId]: content,
      }));
      setCurrentAssistantMessage(content);
    },
    onUserMessageSaved: (messageId, _content) => {
      console.log('User message saved:', messageId);
    },
  });
}
