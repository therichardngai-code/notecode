import { useState, useRef, useCallback } from 'react';
import type { ChatMessage, ToolCommand } from '@/shared/types';
import type { ToolUseBlock } from './use-session-websocket';

// Diff preview from WebSocket
export interface RealtimeDiff {
  id: string;
  filePath: string;
  operation: 'edit' | 'write' | 'delete';
  status: string;
  timestamp: number;
}

export function useRealtimeState() {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [currentToolUse, setCurrentToolUse] = useState<ToolUseBlock | null>(null);
  const [streamingToolUses, setStreamingToolUses] = useState<ToolCommand[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [wsSessionStatus, setWsSessionStatus] = useState<string | null>(null);
  const [messageBuffers, setMessageBuffers] = useState<Record<string, string>>({});
  const [realtimeDiffs, setRealtimeDiffs] = useState<RealtimeDiff[]>([]);
  const streamingBufferRef = useRef<string>('');
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Handle diff_preview WebSocket message
  const handleDiffPreview = useCallback((data: { id: string; filePath: string; operation: 'edit' | 'write' | 'delete'; status: string }) => {
    setRealtimeDiffs(prev => {
      // Update existing or add new
      const idx = prev.findIndex(d => d.id === data.id);
      const newDiff: RealtimeDiff = { ...data, timestamp: Date.now() };
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newDiff;
        return updated;
      }
      return [...prev, newDiff];
    });
  }, []);

  // Clear diffs (call when session ends/changes)
  const clearRealtimeDiffs = useCallback(() => setRealtimeDiffs([]), []);

  return {
    realtimeMessages,
    setRealtimeMessages,
    currentAssistantMessage,
    setCurrentAssistantMessage,
    currentToolUse,
    setCurrentToolUse,
    streamingToolUses,
    setStreamingToolUses,
    isWaitingForResponse,
    setIsWaitingForResponse,
    wsSessionStatus,
    setWsSessionStatus,
    messageBuffers,
    setMessageBuffers,
    streamingBufferRef,
    processedMessageIds,
    // Diff preview state
    realtimeDiffs,
    handleDiffPreview,
    clearRealtimeDiffs,
  };
}
