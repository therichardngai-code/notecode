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
    // Also handle: 'text' (legacy), 'tool_blocked', 'usage'
    type: 'text' | 'message' | 'tool_use' | 'tool_result' | 'thinking' | 'usage' | 'tool_blocked' | 'result' | 'system';
    content?: string | Record<string, unknown>;
    tool?: { name: string; input: Record<string, unknown> };
    result?: string;
    usage?: { input: number; output: number; total: number };
    // For tool_blocked events
    toolName?: string;
    reason?: string;
    severity?: 'danger' | 'warning';
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
  onMessage?: (text: string, isFinal: boolean) => void;
  onToolUse?: (tool: ToolUseBlock) => void;
  onStatus?: (status: StatusMessage['status']) => void;
  onApprovalRequired?: (data: ApprovalRequiredMessage['data']) => void;
  onDiffPreview?: (data: DiffPreviewMessage['data']) => void;
  onToolBlocked?: (data: ToolBlockedData) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
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
 * Content can be: string, { content: [{ type: 'text', text: '...' }] }, or other formats
 */
function extractTextFromContent(content: unknown): string {
  const parsed = parseCliContent(content);
  if (!parsed) return typeof content === 'string' ? content : '';

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
 */
function extractToolUseBlocks(content: unknown): ToolUseBlock[] {
  const parsed = parseCliContent(content);
  if (!parsed || !Array.isArray(parsed.content)) return [];

  return parsed.content
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
            // Handle tool_blocked specially
            if (message.data.type === 'tool_blocked' && message.data.toolName && message.data.reason) {
              cbs.onToolBlocked?.({
                toolName: message.data.toolName,
                reason: message.data.reason,
                severity: message.data.severity || 'warning',
              });
            }
            // Handle assistant messages for streaming (backend sends type: 'message')
            if (message.data.type === 'message' && message.data.content) {
              // Extract text
              const text = extractTextFromContent(message.data.content);
              if (text) {
                cbs.onMessage?.(text, false);
              }
              // Extract tool_use blocks
              const toolBlocks = extractToolUseBlocks(message.data.content);
              for (const tool of toolBlocks) {
                cbs.onToolUse?.(tool);
              }
            }
            // Handle text messages for streaming (legacy/direct text)
            if (message.data.type === 'text' && typeof message.data.content === 'string') {
              cbs.onMessage?.(message.data.content, false);
            }
            // Handle direct tool_use events
            if (message.data.type === 'tool_use' && message.data.tool) {
              cbs.onToolUse?.({
                id: '',
                name: message.data.tool.name,
                input: message.data.tool.input,
              });
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
