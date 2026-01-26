import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { StreamParser } from '../../infrastructure/realtime';

export interface StreamBlock {
  type: string;
  content?: string;
  language?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface UseStreamingSessionOptions {
  sessionId: string;
  websocketUrl: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface UseStreamingSessionReturn {
  blocks: StreamBlock[];
  isStreaming: boolean;
  error: Error | null;
  startStreaming: () => void;
  stopStreaming: () => void;
}

export const useStreamingSession = (
  options: UseStreamingSessionOptions
): UseStreamingSessionReturn => {
  const [blocks, setBlocks] = useState<StreamBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [parser] = useState(() => new StreamParser());

  const handleMessage = useCallback(
    (data: unknown) => {
      try {
        const message = data as { type: string; sessionId: string; chunk?: string };

        if (message.sessionId !== options.sessionId) {
          return;
        }

        if (message.type === 'stream' && message.chunk) {
          const chunks = parser.parse(message.chunk);
          const newBlocks = chunks.map((c) => c.data as StreamBlock);
          setBlocks((prev) => [...prev, ...newBlocks]);
        } else if (message.type === 'complete') {
          setIsStreaming(false);
          options.onComplete?.();
        } else if (message.type === 'error') {
          const err = new Error('Streaming error occurred');
          setError(err);
          setIsStreaming(false);
          options.onError?.(err);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
      }
    },
    [options, parser]
  );

  const handleError = useCallback(
    (_evt: Event) => {
      const err = new Error('WebSocket error');
      setError(err);
      setIsStreaming(false);
      options.onError?.(err);
    },
    [options]
  );

  const { isConnected, connect, disconnect, send } = useWebSocket({
    url: options.websocketUrl,
    onMessage: handleMessage,
    onError: handleError,
  });

  const startStreaming = useCallback(() => {
    if (!isConnected) {
      connect();
    }
    setBlocks([]);
    setError(null);
    setIsStreaming(true);
    parser.reset();

    // Send start message
    send({ type: 'start', sessionId: options.sessionId });
  }, [isConnected, connect, send, options.sessionId, parser]);

  const stopStreaming = useCallback(() => {
    send({ type: 'stop', sessionId: options.sessionId });
    setIsStreaming(false);
    disconnect();
  }, [send, disconnect, options.sessionId]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    blocks,
    isStreaming,
    error,
    startStreaming,
    stopStreaming,
  };
};
