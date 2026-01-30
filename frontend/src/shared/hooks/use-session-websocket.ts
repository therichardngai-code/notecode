/**
 * WebSocket hook for real-time session communication
 * Handles connection, reconnection, and message handling for AI sessions
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSessionWebSocketUrl } from '@/adapters/api/sessions-api';

// Client → Server message types
export interface UserInputMessage {
  type: 'user_input';
  content: string;
  model?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  files?: string[];
  disableWebTools?: boolean; // true = disallow WebSearch + WebFetch
}

export interface CancelMessage {
  type: 'cancel';
}

export interface ApprovalResponseMessage {
  type: 'approval_response';
  requestId: string;
  approved: boolean;
}

type ClientMessage = UserInputMessage | CancelMessage | ApprovalResponseMessage;

// Server → Client message types
export interface OutputMessage {
  type: 'output';
  data: {
    // Backend sends: 'message' (assistant text), 'tool_use', 'tool_result', 'thinking', 'result', 'system'
    // Also handle: 'text' (legacy), 'tool_blocked', 'usage', 'stream_event' (real-time streaming)
    // New: 'delta' (streaming chunk), 'streaming_buffer' (reconnect catch-up)
    type: 'text' | 'message' | 'tool_use' | 'tool_result' | 'thinking' | 'usage' | 'tool_blocked' | 'result' | 'system' | 'stream_event' | 'delta' | 'streaming_buffer' | 'user_message_saved';
    content?: string | Record<string, unknown>;
    tool?: { name: string; input: Record<string, unknown> };
    result?: string;
    usage?: { input: number; output: number; total: number };
    // For tool_blocked events
    toolName?: string;
    reason?: string;
    severity?: 'danger' | 'warning';
    // For delta streaming (new)
    messageId?: string;
    text?: string;
    offset?: number;
    // For message with status (new)
    status?: 'streaming' | 'complete';
  };
}

export interface StatusMessage {
  type: 'status';
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

export interface ApprovalRequiredMessage {
  type: 'approval_required';
  data: {
    requestId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    category: 'safe' | 'requires-approval' | 'dangerous';
    timeoutAt: number;
  };
}

export interface DiffPreviewMessage {
  type: 'diff_preview';
  data: {
    id: string;
    filePath: string;
    operation: 'edit' | 'write' | 'delete';
    content: string;
  };
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ServerMessage =
  | OutputMessage
  | StatusMessage
  | ApprovalRequiredMessage
  | DiffPreviewMessage
  | ErrorMessage;

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Tool blocked data type
export interface ToolBlockedData {
  toolName: string;
  reason: string;
  severity: 'danger' | 'warning';
}

// Hook options
export interface UseSessionWebSocketOptions {
  sessionId: string | null;
  enabled?: boolean;
  onOutput?: (data: OutputMessage['data']) => void;
  onMessage?: (text: string, isFinal: boolean, messageId?: string) => void;
  onToolUse?: (tool: ToolUseBlock) => void;
  onStatus?: (status: StatusMessage['status']) => void;
  onApprovalRequired?: (data: ApprovalRequiredMessage['data']) => void;
  onDiffPreview?: (data: DiffPreviewMessage['data']) => void;
  onToolBlocked?: (data: ToolBlockedData) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  // New: Delta streaming handlers
  onDelta?: (messageId: string, text: string, offset: number) => void;
  onStreamingBuffer?: (messageId: string, content: string, offset: number) => void;
  // New: User message saved confirmation (Option B - no optimistic)
  onUserMessageSaved?: (messageId: string, content: string) => void;
}

// Hook return type
export interface UseSessionWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  sendUserInput: (content: string, options?: Omit<UserInputMessage, 'type' | 'content'>) => void;
  sendCancel: () => void;
  sendApprovalResponse: (requestId: string, approved: boolean) => void;
  connect: () => void;
  disconnect: () => void;
}

// Tool use block extracted from message
export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Parse CLI message content - can be stringified JSON or direct object
 * CLI sends: { type: 'text', content: '{"type":"message",...}' }
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
 * Content can be: string, direct array [{type:'text',text:'...'}], { content: [...] }, or full API response
 */
function extractTextFromContent(content: unknown): string {
  // Handle direct array format: [{type:'text',text:'...'}]
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: string; text: string } =>
        typeof block === 'object' && block !== null && block.type === 'text' && typeof block.text === 'string'
      )
      .map(block => block.text)
      .join('');
  }

  const parsed = parseCliContent(content);
  // If content is a string that looks like JSON but failed to parse, don't return it raw
  // This prevents displaying truncated/partial JSON during streaming
  if (!parsed) {
    if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
      return ''; // Return empty for unparseable JSON-like content
    }
    return typeof content === 'string' ? content : '';
  }

  // Handle full API response format: { model: '...', role: 'assistant', content: [...] }
  if (parsed.model && parsed.role && Array.isArray(parsed.content)) {
    return (parsed.content as Array<{ type?: string; text?: string }>)
      .filter(block => block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('');
  }

  // Handle Claude message format: { content: [{ type: 'text', text: '...' }] }
  if (Array.isArray(parsed.content)) {
    return parsed.content
      .filter((block): block is { type: string; text: string } =>
        typeof block === 'object' && block !== null && block.type === 'text' && typeof block.text === 'string'
      )
      .map(block => block.text)
      .join('');
  }
  // Handle direct text
  if (parsed.type === 'text' && typeof parsed.text === 'string') {
    return parsed.text;
  }
  return '';
}

/**
 * Extract tool_use blocks from Claude CLI message content
 * Handles: direct array, { content: [...] }, full API response { model:'...', content:[...] }
 */
function extractToolUseBlocks(content: unknown): ToolUseBlock[] {
  // Handle direct array format
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: string; id: string; name: string; input: Record<string, unknown> } =>
        typeof block === 'object' && block !== null && block.type === 'tool_use'
      )
      .map(block => ({
        id: block.id || '',
        name: block.name || '',
        input: block.input || {},
      }));
  }

  const parsed = parseCliContent(content);
  if (!parsed) return [];

  // Handle full API response or nested content array
  const contentArray = Array.isArray(parsed.content) ? parsed.content : null;
  if (!contentArray) return [];

  return contentArray
    .filter((block): block is { type: string; id: string; name: string; input: Record<string, unknown> } =>
      typeof block === 'object' && block !== null && block.type === 'tool_use'
    )
    .map(block => ({
      id: block.id || '',
      name: block.name || '',
      input: block.input || {},
    }));
}

/**
 * WebSocket hook for session communication
 * Uses refs for callbacks to prevent reconnection loops from unstable callback references
 */
export function useSessionWebSocket(options: UseSessionWebSocketOptions): UseSessionWebSocketReturn {
  const {
    sessionId,
    enabled = true,
    onOutput,
    onMessage,
    onToolUse,
    onStatus,
    onApprovalRequired,
    onDiffPreview,
    onToolBlocked,
    onError,
    onConnected,
    onDisconnected,
    onDelta,
    onStreamingBuffer,
    onUserMessageSaved,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Store callbacks in refs to avoid dependency issues (prevent reconnection loops)
  const callbacksRef = useRef({
    onOutput,
    onMessage,
    onToolUse,
    onStatus,
    onApprovalRequired,
    onDiffPreview,
    onToolBlocked,
    onError,
    onConnected,
    onDisconnected,
    onDelta,
    onStreamingBuffer,
    onUserMessageSaved,
  });

  // Update refs when callbacks change (no effect trigger)
  useEffect(() => {
    callbacksRef.current = {
      onOutput,
      onMessage,
      onToolUse,
      onStatus,
      onApprovalRequired,
      onDiffPreview,
      onToolBlocked,
      onError,
      onConnected,
      onDisconnected,
      onDelta,
      onStreamingBuffer,
      onUserMessageSaved,
    };
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect to WebSocket (only depends on sessionId, not callbacks)
  const connect = useCallback(() => {
    if (!sessionId) return;

    cleanup();
    setConnectionState('connecting');

    const wsUrl = getSessionWebSocketUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      callbacksRef.current.onConnected?.();
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      callbacksRef.current.onDisconnected?.();
      wsRef.current = null;
    };

    ws.onerror = () => {
      setConnectionState('error');
      callbacksRef.current.onError?.('WebSocket connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        const cbs = callbacksRef.current;

        switch (message.type) {
          case 'output':
            // Handle delta streaming (new backend format)
            if (message.data.type === 'delta' && message.data.messageId && message.data.text !== undefined) {
              cbs.onDelta?.(message.data.messageId, message.data.text, message.data.offset ?? 0);
              cbs.onOutput?.(message.data);
              return;
            }
            // Handle streaming_buffer for reconnect catch-up (new backend format)
            if (message.data.type === 'streaming_buffer' && message.data.messageId && typeof message.data.content === 'string') {
              cbs.onStreamingBuffer?.(message.data.messageId, message.data.content, message.data.offset ?? 0);
              cbs.onOutput?.(message.data);
              return;
            }
            // Handle user_message_saved (Option B - no optimistic, wait for confirmation)
            if (message.data.type === 'user_message_saved' && message.data.messageId && typeof message.data.content === 'string') {
              cbs.onUserMessageSaved?.(message.data.messageId, message.data.content);
              cbs.onOutput?.(message.data);
              return;
            }
            // Handle tool_blocked specially
            if (message.data.type === 'tool_blocked' && message.data.toolName && message.data.reason) {
              cbs.onToolBlocked?.({
                toolName: message.data.toolName,
                reason: message.data.reason,
                severity: message.data.severity || 'warning',
              });
            }
            // Handle assistant messages (backend sends type: 'message')
            // Formats to handle:
            // 1. Full API response at data level: { type:'message', role:'assistant', content:[...], model:'...' }
            // 2. Nested format: { type:'message', content: { role:'assistant', content:'text' or [...] } }
            // 3. Direct array: { type:'message', content: [{type:'text',text:'...'}] }
            // 4. Legacy no-role format: { type:'message', content: {...} }
            if (message.data.type === 'message') {
              const data = message.data as Record<string, unknown>;
              let text = '';
              let processed = false;

              // Format 1: Full API response at data level (has model, role at data level)
              if (data.role === 'assistant' && data.model) {
                if (Array.isArray(data.content)) {
                  text = (data.content as Array<{ type?: string; text?: string }>)
                    .filter(block => block.type === 'text' && typeof block.text === 'string')
                    .map(block => block.text)
                    .join('');
                } else if (typeof data.content === 'string') {
                  text = data.content;
                }
                processed = true;
              }

              // Format 2-4: Content is nested object or array
              if (!processed && data.content) {
                const msgContent = data.content as Record<string, unknown>;

                // Only process assistant messages - user messages come from API
                if (msgContent.role === 'assistant') {
                  if (typeof msgContent.content === 'string') {
                    text = msgContent.content;
                  } else if (Array.isArray(msgContent.content)) {
                    text = (msgContent.content as Array<{ type?: string; text?: string }>)
                      .filter(block => block.type === 'text' && typeof block.text === 'string')
                      .map(block => block.text)
                      .join('');
                  }
                  processed = true;
                } else if (!msgContent.role) {
                  // Legacy no-role format or direct array
                  text = extractTextFromContent(data.content);
                  processed = true;
                }
              }

              if (text) {
                cbs.onMessage?.(text, true, data.messageId as string | undefined);
              }

              // Extract tool_use blocks for all formats
              const toolBlocks = extractToolUseBlocks(message.data.content);
              for (const tool of toolBlocks) {
                cbs.onToolUse?.(tool);
              }
            }
            // Handle text messages for streaming (legacy/direct text)
            if (message.data.type === 'text' && typeof message.data.content === 'string') {
              const content = message.data.content;
              const msgId = message.data.messageId as string | undefined;
              // Check if content is JSON (Claude API response) - extract text instead of showing raw
              if (content.startsWith('{') && content.includes('"type":"message"')) {
                const text = extractTextFromContent(content);
                if (text) {
                  cbs.onMessage?.(text, false, msgId);
                }
                // Also extract tool_use blocks from JSON response
                const toolBlocks = extractToolUseBlocks(content);
                for (const tool of toolBlocks) {
                  cbs.onToolUse?.(tool);
                }
              } else {
                cbs.onMessage?.(content, false, msgId);
              }
            }
            // Handle direct tool_use events
            if (message.data.type === 'tool_use' && message.data.tool) {
              cbs.onToolUse?.({
                id: '',
                name: message.data.tool.name,
                input: message.data.tool.input,
              });
            }
            // Handle stream_event for real-time text streaming (typewriter effect)
            if (message.data.type === 'stream_event') {
              const content = message.data.content as Record<string, unknown> | undefined;
              const event = content?.event as Record<string, unknown> | undefined;
              const msgId = message.data.messageId as string | undefined;
              // Extract text delta from content_block_delta events
              if (event?.type === 'content_block_delta') {
                const delta = event.delta as Record<string, unknown> | undefined;
                if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
                  cbs.onMessage?.(delta.text, false, msgId);
                }
              }
            }
            cbs.onOutput?.(message.data);
            break;
          case 'status':
            // Send final message marker on completion
            if (message.status === 'completed' || message.status === 'failed' || message.status === 'cancelled') {
              cbs.onMessage?.('', true);
            }
            cbs.onStatus?.(message.status);
            break;
          case 'approval_required':
            cbs.onApprovalRequired?.(message.data);
            break;
          case 'diff_preview':
            cbs.onDiffPreview?.(message.data);
            break;
          case 'error':
            cbs.onError?.(message.message);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
  }, [sessionId, cleanup]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  // Send message helper
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Send user input
  const sendUserInput = useCallback((
    content: string,
    messageOptions?: Omit<UserInputMessage, 'type' | 'content'>
  ) => {
    send({
      type: 'user_input',
      content,
      ...messageOptions,
    });
  }, [send]);

  // Send cancel
  const sendCancel = useCallback(() => {
    send({ type: 'cancel' });
  }, [send]);

  // Send approval response
  const sendApprovalResponse = useCallback((requestId: string, approved: boolean) => {
    send({
      type: 'approval_response',
      requestId,
      approved,
    });
  }, [send]);

  // Auto-connect when sessionId changes and enabled (stable deps only)
  useEffect(() => {
    if (sessionId && enabled) {
      connect();
    } else {
      disconnect();
    }

    return cleanup;
  }, [sessionId, enabled, connect, disconnect, cleanup]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    sendUserInput,
    sendCancel,
    sendApprovalResponse,
    connect,
    disconnect,
  };
}
