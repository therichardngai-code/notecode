import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, Block } from '../../../domain/entities';
import { getWsUrl } from '@/shared/lib/api-config';

interface UseSessionStreamOptions {
  sessionId: string;
  enabled?: boolean;
  onMessage?: (message: Message) => void;
  onBlock?: (block: Block) => void;
  onError?: (error: Error) => void;
}

interface UseSessionStreamReturn {
  isConnected: boolean;
  isStreaming: boolean;
  currentStreamId: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string) => void;
}

export function useSessionStream({
  sessionId,
  enabled = true,
  onMessage,
  onBlock,
  onError,
}: UseSessionStreamOptions): UseSessionStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl(`/ws/session/${sessionId}`));

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'stream_start':
              setIsStreaming(true);
              setCurrentStreamId(data.streamId);
              break;

            case 'stream_block':
              onBlock?.(data.block);
              break;

            case 'stream_message':
              onMessage?.(data.message);
              break;

            case 'stream_end':
              setIsStreaming(false);
              setCurrentStreamId(null);
              break;

            case 'error':
              onError?.(new Error(data.message));
              break;

            default:
              break;
          }
        } catch (err) {
          onError?.(err instanceof Error ? err : new Error('Failed to parse message'));
        }
      };

      ws.onerror = () => {
        onError?.(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);
        setCurrentStreamId(null);
      };

      wsRef.current = ws;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to connect'));
    }
  }, [sessionId, onMessage, onBlock, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        onError?.(new Error('WebSocket not connected'));
        return;
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            content,
          })
        );
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to send message'));
      }
    },
    [onError]
  );

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    isStreaming,
    currentStreamId,
    connect,
    disconnect,
    sendMessage,
  };
}
