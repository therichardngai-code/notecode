/**
 * Chat Session Hook
 * Manages Chat Mode sessions (POST /api/projects/:projectId/chat)
 * Handles session creation, WebSocket streaming, and message state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { projectsApi, type StartChatRequest, type ChatTask } from '@/adapters/api/projects-api';
import { type Session, getSessionWebSocketUrl } from '@/adapters/api/sessions-api';
import type { OutputMessage, StatusMessage, ServerMessage } from './use-session-websocket';

// Chat message type
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: number;
  isStreaming?: boolean;
}

// Chat session state
export type ChatSessionStatus = 'idle' | 'starting' | 'connected' | 'streaming' | 'error';

// Hook options
export interface UseChatSessionOptions {
  projectId: string | null;
  onError?: (message: string) => void;
}

// Hook return type
export interface UseChatSessionReturn {
  // State
  status: ChatSessionStatus;
  messages: ChatMessage[];
  currentTask: ChatTask | null;
  currentSession: Session | null;
  isStreaming: boolean;

  // Actions
  startChat: (request: Omit<StartChatRequest, 'message'> & { message: string }) => Promise<void>;
  sendFollowUp: (content: string) => void;
  cancelStream: () => void;
  resetChat: () => void;
}

/**
 * Hook for managing Chat Mode sessions
 */
export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  const { projectId, onError } = options;

  // Session state
  const [status, setStatus] = useState<ChatSessionStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTask, setCurrentTask] = useState<ChatTask | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantMessageRef = useRef<string>('');

  // Cleanup WebSocket
  const cleanupWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect to WebSocket for streaming
  const connectWebSocket = useCallback((sessionId: string) => {
    cleanupWs();

    const wsUrl = getSessionWebSocketUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onclose = () => {
      setIsStreaming(false);
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('error');
      onError?.('WebSocket connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'output': {
            const outputMsg = message as OutputMessage;
            if (outputMsg.data.type === 'text' && outputMsg.data.content) {
              // Append to current assistant message
              currentAssistantMessageRef.current += outputMsg.data.content;

              // Update the last assistant message (streaming)
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: currentAssistantMessageRef.current }
                  ];
                }
                return prev;
              });
            }
            break;
          }

          case 'status': {
            const statusMsg = message as StatusMessage;
            if (statusMsg.status === 'running') {
              setIsStreaming(true);
              setStatus('streaming');
              // Add empty assistant message for streaming
              currentAssistantMessageRef.current = '';
              setMessages(prev => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  isStreaming: true,
                }
              ]);
            } else if (statusMsg.status === 'completed' || statusMsg.status === 'failed' || statusMsg.status === 'cancelled') {
              setIsStreaming(false);
              setStatus('connected');
              // Mark last message as not streaming
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                  return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
                }
                return prev;
              });
            }
            break;
          }

          case 'error': {
            onError?.(message.message);
            setIsStreaming(false);
            break;
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
  }, [cleanupWs, onError]);

  // Start new chat session
  const startChat = useCallback(async (request: Omit<StartChatRequest, 'message'> & { message: string }) => {
    if (!projectId) {
      onError?.('No project selected');
      return;
    }

    setStatus('starting');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: request.message,
      timestamp: new Date(),
    };
    setMessages([userMessage]);

    try {
      // Call Chat Mode API
      const response = await projectsApi.startChat(projectId, request);

      setCurrentTask(response.task);
      setCurrentSession(response.session);

      // Connect WebSocket for streaming
      connectWebSocket(response.session.id);
    } catch (err) {
      setStatus('error');
      onError?.(err instanceof Error ? err.message : 'Failed to start chat');
    }
  }, [projectId, connectWebSocket, onError]);

  // Send follow-up message (via WebSocket)
  const sendFollowUp = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError?.('Not connected');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'user_input',
      content,
    }));
  }, [onError]);

  // Cancel current stream
  const cancelStream = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
  }, []);

  // Reset chat state
  const resetChat = useCallback(() => {
    cleanupWs();
    setStatus('idle');
    setMessages([]);
    setCurrentTask(null);
    setCurrentSession(null);
    setIsStreaming(false);
    currentAssistantMessageRef.current = '';
  }, [cleanupWs]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupWs;
  }, [cleanupWs]);

  return {
    status,
    messages,
    currentTask,
    currentSession,
    isStreaming,
    startChat,
    sendFollowUp,
    cancelStream,
    resetChat,
  };
}
