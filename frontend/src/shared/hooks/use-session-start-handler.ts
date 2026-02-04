/**
 * Shared hook for session start/retry/renew logic
 * Extracts duplicated code from tasks.$taskId.tsx and FloatingTaskDetailPanel.tsx
 * Single source of truth → fixes apply to both views automatically
 */

import { useCallback } from 'react';
import { useStartSession } from './use-sessions-query';
import type { SessionResumeMode } from '@/adapters/api/sessions-api';
import type { ChatMessage, ToolCommand } from '@/shared/types';
import type { ChatInputFooterHandle } from '@/shared/components/task-detail';

interface UseSessionStartHandlerParams {
  taskId: string | null;
  // Refs
  chatInputFooterRef: React.RefObject<ChatInputFooterHandle | null>;
  aiSessionContainerRef: React.RefObject<HTMLDivElement | null>;
  streamingBufferRef: React.MutableRefObject<string>;
  processedMessageIds: React.MutableRefObject<Set<string>>;
  messageCounterRef: React.MutableRefObject<number>;
  // State setters
  setRealtimeMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCurrentAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  setStreamingToolUses: React.Dispatch<React.SetStateAction<ToolCommand[]>>;
  setMessageBuffers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setWsSessionStatus: React.Dispatch<React.SetStateAction<string | null>>;
  setJustStartedSession: React.Dispatch<React.SetStateAction<{ id: string; status: string } | null>>;
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveInfoTab: React.Dispatch<React.SetStateAction<'activity' | 'ai-session' | 'diffs' | 'git' | 'sessions'>>;
  // Scroll restoration
  resetScrollState: () => void;
  saveScrollPosition: () => void;
  // Current tab
  activeInfoTab: 'activity' | 'ai-session' | 'diffs' | 'git' | 'sessions';
  // Git init callback (optional - for autoBranch warning)
  onGitInitRequired?: (mode: SessionResumeMode, prompt?: string) => void;
}

interface UseSessionStartHandlerReturn {
  handleStartSessionWithMode: (mode: SessionResumeMode) => Promise<void>;
  isStartingSession: boolean;
}

/**
 * Hook that provides session start/retry/renew functionality
 * Used by both tasks.$taskId.tsx and FloatingTaskDetailPanel.tsx
 */
export function useSessionStartHandler({
  taskId,
  chatInputFooterRef,
  aiSessionContainerRef,
  streamingBufferRef,
  processedMessageIds,
  messageCounterRef,
  setRealtimeMessages,
  setCurrentAssistantMessage,
  setStreamingToolUses,
  setMessageBuffers,
  setWsSessionStatus,
  setJustStartedSession,
  setIsWaitingForResponse,
  setActiveInfoTab,
  resetScrollState,
  saveScrollPosition,
  activeInfoTab,
  onGitInitRequired,
}: UseSessionStartHandlerParams): UseSessionStartHandlerReturn {
  const startSessionMutation = useStartSession();

  const handleStartSessionWithMode = useCallback(async (mode: SessionResumeMode) => {
    console.log('[useSessionStartHandler] handleStartSessionWithMode called with mode:', mode, 'taskId:', taskId);
    if (!taskId) return;

    // Capture chat input BEFORE clearing state
    const newPrompt = chatInputFooterRef.current?.getChatInput() || undefined;

    // Prevent height collapse: lock container height before clearing state
    const container = aiSessionContainerRef.current;
    if (container) {
      container.style.minHeight = `${container.offsetHeight}px`;
    }

    // Reset scroll for renew, preserve for retry
    if (mode === 'renew') {
      resetScrollState();
    }
    if (mode === 'retry') {
      saveScrollPosition();
    }

    // Clear chat state based on mode
    if (mode === 'renew') {
      setRealtimeMessages([]);
      setCurrentAssistantMessage('');
      setStreamingToolUses([]);
      setMessageBuffers({});
      processedMessageIds.current.clear();
      streamingBufferRef.current = ''; // Clear streaming buffer to prevent stale content leak
    } else {
      // Retry/Resume mode: clear realtime messages to prevent accumulation
      // API query provides message history, realtime only for NEW messages
      setRealtimeMessages([]);
      setStreamingToolUses([]);
      setCurrentAssistantMessage('');
      setMessageBuffers({});
      processedMessageIds.current.clear();
      streamingBufferRef.current = '';
    }

    // NOTE: Don't clear chat input here - wait until session starts successfully
    // This preserves the prompt for retry on git init dialog flow

    setWsSessionStatus(null);
    setJustStartedSession(null);

    // Release height lock after delay
    setTimeout(() => {
      if (container) container.style.minHeight = '';
    }, 500);

    // Add user message optimistically (always fresh start since state cleared above)
    if (newPrompt) {
      const userMessage: ChatMessage = {
        id: `user-optimistic-${++messageCounterRef.current}`,
        role: 'user',
        content: newPrompt,
      };
      setRealtimeMessages([userMessage]);
    }

    // Show loading state BEFORE async call
    setIsWaitingForResponse(true);

    try {
      const response = await startSessionMutation.mutateAsync({
        taskId,
        mode,
        initialPrompt: newPrompt,
      });
      console.log('Session started:', response.session.id, 'wsUrl:', response.wsUrl);

      setJustStartedSession({ id: response.session.id, status: 'running' });

      // Clear chat input AFTER successful session start (preserves prompt for retry on error)
      if (newPrompt) {
        chatInputFooterRef.current?.clearChatInput();
      }

      // Switch to AI Session tab if not already there
      if (activeInfoTab !== 'ai-session') {
        setActiveInfoTab('ai-session');
      }
    } catch (err: unknown) {
      setIsWaitingForResponse(false);

      // Check for GIT_INIT_REQUIRED warning in error response (400 status)
      // ApiError stores full response in 'details' (see api-client.ts)
      const apiError = err as { details?: { warnings?: Array<{ code: string }> } };
      const warnings = apiError.details?.warnings;
      const gitWarning = warnings?.find(w => w.code === 'GIT_INIT_REQUIRED');

      if (gitWarning) {
        onGitInitRequired?.(mode, newPrompt);
        return; // Show dialog instead of error
      }

      console.error('Failed to start session:', err);
    }
  }, [
    taskId,
    chatInputFooterRef,
    aiSessionContainerRef,
    streamingBufferRef,
    processedMessageIds,
    messageCounterRef,
    setRealtimeMessages,
    setCurrentAssistantMessage,
    setStreamingToolUses,
    setMessageBuffers,
    setWsSessionStatus,
    setJustStartedSession,
    setIsWaitingForResponse,
    setActiveInfoTab,
    resetScrollState,
    saveScrollPosition,
    activeInfoTab,
    startSessionMutation,
    onGitInitRequired,
  ]);

  return {
    handleStartSessionWithMode,
    isStartingSession: startSessionMutation.isPending,
  };
}
