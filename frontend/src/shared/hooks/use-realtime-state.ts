import { useState, useRef } from 'react';
import type { ChatMessage, ToolCommand } from '@/shared/types';
import type { ToolUseBlock } from './use-session-websocket';

export function useRealtimeState() {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [currentToolUse, setCurrentToolUse] = useState<ToolUseBlock | null>(null);
  const [streamingToolUses, setStreamingToolUses] = useState<ToolCommand[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [wsSessionStatus, setWsSessionStatus] = useState<string | null>(null);
  const [messageBuffers, setMessageBuffers] = useState<Record<string, string>>({});
  const streamingBufferRef = useRef<string>('');
  const processedMessageIds = useRef<Set<string>>(new Set());

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
  };
}
