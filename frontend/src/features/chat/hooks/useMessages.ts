import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../../../domain/entities';

interface UseMessagesOptions {
  sessionId?: string;
  initialMessages?: Message[];
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  refetch: () => Promise<void>;
}

export function useMessages({
  sessionId,
  initialMessages = [],
}: UseMessagesOptions = {}): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId, fetchMessages]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      );
    },
    []
  );

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const refetch = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    refetch,
  };
}
