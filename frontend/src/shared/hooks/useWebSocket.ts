import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type WebSocketConfig } from '../../infrastructure/realtime';

export interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: unknown) => void;
  connect: () => void;
  disconnect: () => void;
  error: Event | null;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);

  const connect = useCallback(() => {
    if (!clientRef.current) {
      const config: WebSocketConfig = {
        url: options.url,
        reconnectInterval: options.reconnectInterval,
        maxReconnectAttempts: options.maxReconnectAttempts,
        onOpen: () => setIsConnected(true),
        onClose: () => setIsConnected(false),
        onMessage: options.onMessage,
        onError: (evt) => {
          setError(evt);
          options.onError?.(evt);
        },
      };

      clientRef.current = new WebSocketClient(config);
    }
    clientRef.current.connect();
  }, [options]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  const send = useCallback((data: unknown) => {
    try {
      clientRef.current?.send(data);
    } catch (err) {
      console.error('Failed to send WebSocket message:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    isConnected,
    send,
    connect,
    disconnect,
    error,
  };
};
