/**
 * Chat Session Hook
 * Manages Chat Mode sessions (POST /api/projects/:projectId/chat)
 * Handles session creation, WebSocket streaming, and message state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { projectsApi, type StartChatRequest, type ContinueChatRequest, type ChatTask } from '@/adapters/api/projects-api';
import { type Session, getSessionWebSocketUrl } from '@/adapters/api/sessions-api';
import type { OutputMessage, StatusMessage, ServerMessage, ToolUseBlock } from './use-session-websocket';

// Tool command for display (same as TaskDetailPage)
export interface ToolCommand {
  cmd: string;
  status: 'success' | 'error';
  input?: Record<string, unknown>;
}

// Chat message type
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  steps?: number;
  isStreaming?: boolean;
  commands?: ToolCommand[];
}

// Chat session state
export type ChatSessionStatus = 'idle' | 'starting' | 'connected' | 'streaming' | 'error';

/**
 * Parse CLI message content - can be stringified JSON or direct object
 * Aligned with use-session-websocket.ts parseCliContent
 */
function parseCliContent(content: unknown): Record<string, unknown> | null {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (typeof content === 'object' && content !== null) {
    return content as Record<string, unknown>;
  }
  return null;
}

/**
 * Extract text from Claude CLI message content
 * Aligned with use-session-websocket.ts extractTextFromContent
 */
function extractTextFromContent(content: unknown): string {
  const parsed = parseCliContent(content);
  if (!parsed) return typeof content === 'string' ? content : '';

  // Handle Claude message format: { content: [{ type: 'text', text: '...' }] }
  if (Array.isArray(parsed.content)) {
    return (parsed.content as Array<{ type?: string; text?: string }>)
      .filter(block => block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('');
  }
  // Handle direct text
  if (parsed.type === 'text' && typeof parsed.text === 'string') {
    return parsed.text as string;
  }
  return '';
}

/**
 * Extract tool_use blocks from Claude CLI message content
 * Handles: direct array, { content: [...] }, full API response
 * Aligned with use-session-websocket.ts extractToolUseBlocks
 */
function extractToolUseBlocks(content: unknown): ToolCommand[] {
  // Handle direct array format (WebSocket sends content as array)
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: string; id?: string; name: string; input?: Record<string, unknown> } =>
        typeof block === 'object' && block !== null && block.type === 'tool_use' && !!block.name
      )
      .map(block => ({
        cmd: block.name,
        status: 'success' as const,
        input: block.input || {},
      }));
  }

  // Handle { content: [...] } or JSON string format
  const parsed = parseCliContent(content);
  if (!parsed || !Array.isArray(parsed.content)) return [];

  return (parsed.content as Array<{ type?: string; id?: string; name?: string; input?: Record<string, unknown> }>)
    .filter(block => block.type === 'tool_use' && block.name)
    .map(block => ({
      cmd: block.name || '',
      status: 'success' as const,
      input: block.input || {},
    }));
}

/**
 * Process content to extract text and tools
 * Handles multiple formats: array of blocks, direct objects, nested JSON
 */
function processBlocks(content: unknown): { text: string; tools: ToolCommand[] } {
  let text = '';
  const tools: ToolCommand[] = [];

  // If content is a string, try to parse it as JSON first
  let data = content;
  if (typeof content === 'string') {
    try {
      data = JSON.parse(content);
    } catch {
      // Plain text, not JSON
      return { text: content, tools: [] };
    }
  }

  // Handle array of blocks (WebSocket format: [{ type: 'text', content: '...' }])
  const blocks = Array.isArray(data) ? data : [data];

  for (const block of blocks) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as { type?: string; content?: unknown; text?: string; name?: string; input?: Record<string, unknown>; tool?: { name: string; input: Record<string, unknown> } };

    // Direct tool_use block with name (API format)
    if (b.type === 'tool_use' && b.name) {
      tools.push({ cmd: b.name, status: 'success', input: b.input ?? {} });
      continue;
    }

    // Direct tool_use block with tool object (WebSocket format)
    if (b.type === 'tool_use' && b.tool?.name) {
      tools.push({ cmd: b.tool.name, status: 'success', input: b.tool.input || {} });
      continue;
    }

    // Text block - may contain nested JSON with tool_use
    if (b.type === 'text') {
      const blockContent = b.content ?? b.text ?? '';

      // If blockContent is string, try to parse nested JSON
      if (typeof blockContent === 'string' && blockContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(blockContent);
          if (parsed.content && Array.isArray(parsed.content)) {
            for (const item of parsed.content as Array<{ type?: string; text?: string; name?: string; input?: Record<string, unknown> }>) {
              if (item.type === 'text' && item.text) {
                text += item.text;
              } else if (item.type === 'tool_use' && item.name) {
                tools.push({ cmd: item.name, status: 'success', input: item.input ?? {} });
              }
            }
            continue;
          }
        } catch {
          // Not valid JSON, treat as plain text
        }
      }
      if (typeof blockContent === 'string') {
        text += blockContent;
      }
    }

    // Message block with nested content array (direct from CLI)
    if (b.type === 'message' && Array.isArray(b.content)) {
      for (const item of b.content as Array<{ type?: string; text?: string; name?: string; input?: Record<string, unknown> }>) {
        if (item.type === 'text' && item.text) {
          text += item.text;
        } else if (item.type === 'tool_use' && item.name) {
          tools.push({ cmd: item.name, status: 'success', input: item.input ?? {} });
        }
      }
    }
  }

  return { text, tools };
}

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
  currentToolUse: ToolUseBlock | null;

  // Actions
  startChat: (request: Omit<StartChatRequest, 'message'> & { message: string }) => Promise<void>;
  continueChat: (chatId: string, request: Omit<ContinueChatRequest, 'message'> & { message: string }) => Promise<void>;
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
  const [currentToolUse, setCurrentToolUse] = useState<ToolUseBlock | null>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantMessageRef = useRef<string>('');
  const currentCommandsRef = useRef<ToolCommand[]>([]);
  // Track messageIds to prevent duplicate message creation (aligned with Task Mode)
  const streamedMessageIds = useRef<Set<string>>(new Set());

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
            // Don't cast to Record - preserve array type for proper detection
            const data = outputMsg.data;
            let text = '';
            const tools: ToolCommand[] = [];

            // Handle delta streaming (new backend format - aligned with Task Mode)
            if (typeof data === 'object' && data !== null) {
              const dataObj = data as Record<string, unknown>;

              // Handle delta streaming (typewriter effect)
              if (dataObj.type === 'delta' && typeof dataObj.text === 'string') {
                text = dataObj.text;
              }
              // Handle stream_event for real-time streaming
              else if (dataObj.type === 'stream_event') {
                const content = dataObj.content as Record<string, unknown> | undefined;
                const event = content?.event as Record<string, unknown> | undefined;
                if (event?.type === 'content_block_delta') {
                  const delta = event.delta as Record<string, unknown> | undefined;
                  if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
                    text = delta.text;
                  }
                }
              }
              // Handle direct tool_use events
              else if (dataObj.type === 'tool_use' && (dataObj as { tool?: { name: string; input: Record<string, unknown> } }).tool) {
                const toolData = (dataObj as { tool: { name: string; input: Record<string, unknown> } }).tool;
                tools.push({ cmd: toolData.name, status: 'success', input: toolData.input || {} });
              }
              // Handle message type with content
              else if (dataObj.type === 'message' && dataObj.content) {
                text = extractTextFromContent(dataObj.content);
                const extractedTools = extractToolUseBlocks(dataObj.content);
                tools.push(...extractedTools);
              }
              // Handle text type (legacy)
              else if (dataObj.type === 'text' && typeof dataObj.content === 'string') {
                const content = dataObj.content;
                if (content.startsWith('{') && content.includes('"type":"message"')) {
                  text = extractTextFromContent(content);
                  tools.push(...extractToolUseBlocks(content));
                } else {
                  text = content;
                }
              }
              // Fallback: try processBlocks
              else if (dataObj.content || !dataObj.type) {
                const dataToProcess = dataObj.content ?? dataObj;
                if (dataToProcess) {
                  const { text: t, tools: extractedTools } = processBlocks(dataToProcess);
                  text = t;
                  tools.push(...extractedTools);
                }
              }
            }
            // Handle array format
            else if (Array.isArray(data)) {
              const { text: t, tools: extractedTools } = processBlocks(data);
              text = t;
              tools.push(...extractedTools);
            }

            // Update state with extracted text and tools
            if (text) {
              currentAssistantMessageRef.current += text;
            }
            for (const tool of tools) {
              setCurrentToolUse({ id: '', name: tool.cmd, input: tool.input || {} });
              currentCommandsRef.current.push(tool);
            }
            if (text || tools.length > 0) {
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: currentAssistantMessageRef.current, commands: currentCommandsRef.current.length > 0 ? [...currentCommandsRef.current] : undefined }
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
              // Only create new assistant message if NOT already streaming
              // This prevents duplicate messages when backend sends multiple 'running' events
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                // If already have a streaming assistant message, don't create another
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                  return prev;
                }
                // Create new assistant message - use any accumulated content from early output events
                const msgId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                return [
                  ...prev,
                  {
                    id: msgId,
                    role: 'assistant',
                    content: currentAssistantMessageRef.current, // Use accumulated content if any
                    timestamp: new Date(),
                    isStreaming: true,
                    commands: currentCommandsRef.current.length > 0 ? [...currentCommandsRef.current] : undefined,
                  }
                ];
              });

              setIsStreaming(true);
              setStatus('streaming');
              // Only reset refs if empty - preserve content from early output events
              // Refs will be reset on next follow-up or new chat
              setCurrentToolUse(null);
            } else if (statusMsg.status === 'completed' || statusMsg.status === 'failed' || statusMsg.status === 'cancelled') {
              setIsStreaming(false);
              setStatus('connected');
              setCurrentToolUse(null);
              // Mark last message as not streaming and finalize commands
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                  return [...prev.slice(0, -1), {
                    ...lastMsg,
                    isStreaming: false,
                    commands: currentCommandsRef.current.length > 0 ? [...currentCommandsRef.current] : lastMsg.commands
                  }];
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
    // Reset refs for fresh response
    currentAssistantMessageRef.current = '';
    currentCommandsRef.current = [];

    // Add user message immediately with unique ID
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

  // Continue existing chat session
  const continueChat = useCallback(async (
    chatId: string,
    request: Omit<ContinueChatRequest, 'message'> & { message: string }
  ) => {
    if (!projectId) {
      onError?.('No project selected');
      return;
    }

    setStatus('starting');
    // Reset refs for fresh response
    currentAssistantMessageRef.current = '';
    currentCommandsRef.current = [];

    // Add user message immediately with unique ID
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: request.message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call Continue Chat API
      const response = await projectsApi.continueChat(projectId, chatId, request);

      setCurrentTask(response.task);
      setCurrentSession(response.session);

      // Connect WebSocket for streaming
      connectWebSocket(response.session.id);
    } catch (err) {
      setStatus('error');
      onError?.(err instanceof Error ? err.message : 'Failed to continue chat');
    }
  }, [projectId, connectWebSocket, onError]);

  // Send follow-up message (via WebSocket)
  const sendFollowUp = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError?.('Not connected');
      return;
    }

    // Reset refs BEFORE sending - start fresh for new response
    currentAssistantMessageRef.current = '';
    currentCommandsRef.current = [];

    // Add user message with unique ID
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
    setCurrentToolUse(null);
    currentAssistantMessageRef.current = '';
    currentCommandsRef.current = [];
    streamedMessageIds.current.clear();
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
    currentToolUse,
    startChat,
    continueChat,
    sendFollowUp,
    cancelStream,
    resetChat,
  };
}
