/**
 * Combined hook for task session state
 * Manages session data, WebSocket connection, and streaming state
 */

import { useState, useEffect } from 'react';
import { useLatestSession } from './use-latest-session';
import { useSessionWebSocket } from './use-session-websocket';
import { useSessions, useTaskMessages } from './use-sessions-query';
import { sessionsApi } from '@/adapters/api/sessions-api';
import type { ApprovalRequest } from '@/adapters/api/sessions-api';
import type { ChatMessage } from '@/shared/types/task-detail-types';

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

  // Approvals
  pendingApprovals: ApprovalRequest[];

  // Loading states
  isLoading: boolean;
}

export function useTaskSessionState({
  taskId,
}: UseTaskSessionStateOptions): UseTaskSessionStateReturn {
  const latestSession = useLatestSession(taskId);
  const { data: sessions = [] } = useSessions({ taskId });
  const { data: apiMessages = [] } = useTaskMessages(taskId, 200);

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  // WebSocket connection for latest session
  const {
    isConnected: isWsConnected,
  } = useSessionWebSocket({
    sessionId: latestSession?.id || '',
    enabled: !!latestSession && latestSession.status === 'running',
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

  return {
    latestSession,
    sessions,
    chatMessages,
    isWsConnected,
    pendingApprovals,
    isLoading: !sessions,
  };
}
