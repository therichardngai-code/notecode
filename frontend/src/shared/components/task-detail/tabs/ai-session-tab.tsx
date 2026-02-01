import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { List, useDynamicRowHeight, useListRef } from 'react-window';
import { Bot, MessageSquare, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ApprovalCard } from '../approval-card';
import { ChatMessageItem } from './chat-message-item';
import type { Session, ApprovalRequest } from '@/adapters/api/sessions-api';
import type { ChatMessage } from '@/shared/types/task-detail-types';
import type { ToolUseBlock } from '@/shared/hooks';

/**
 * Row props passed to virtualized row component (react-window v2 API)
 */
interface MessageRowProps {
  allMessages: ChatMessage[];
  expandedCommands: Set<string>;
  onToggleCommand: (cmdKey: string) => void;
  onSetContentModal: (data: { filePath: string; content: string }) => void;
  onOpenFileAsTab: (filePath: string, content: string) => void;
  rowHeight: ReturnType<typeof useDynamicRowHeight>;
}

/**
 * Virtualized message row component for react-window v2
 * Uses observeRowElements for dynamic height measurement
 */
const MessageRow = memo(function MessageRow({
  index,
  style,
  allMessages,
  expandedCommands,
  onToggleCommand,
  onSetContentModal,
  onOpenFileAsTab,
  rowHeight,
}: MessageRowProps & { index: number; style: React.CSSProperties }) {
  const message = allMessages[index];
  const rowRef = useRef<HTMLDivElement>(null);

  // Use react-window v2's observeRowElements for height measurement
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    return rowHeight.observeRowElements([el]);
  }, [rowHeight]);

  return (
    <div style={style}>
      {/* Row wrapper with padding for spacing (replaces space-y-4) */}
      {/* data-react-window-index required by useDynamicRowHeight */}
      <div ref={rowRef} className="py-2" data-react-window-index={index}>
        <ChatMessageItem
          message={message}
          expandedCommands={expandedCommands}
          onToggleCommand={onToggleCommand}
          onSetContentModal={onSetContentModal}
          onOpenFileAsTab={onOpenFileAsTab}
        />
      </div>
    </div>
  );
});

interface AISessionTabProps {
  // Messages
  chatMessages: ChatMessage[];
  realtimeMessages: ChatMessage[];
  currentAssistantMessage: string;

  // Tool use
  currentToolUse: ToolUseBlock | null;
  expandedCommands: Set<string>;

  // Session state
  latestSession: Session | undefined;
  isStartingSession: boolean;
  isWaitingForResponse: boolean;
  isTyping: boolean;
  isWsConnected: boolean;
  isSessionLive: boolean;

  // Approvals
  pendingApprovals: ApprovalRequest[];
  processingApproval: string | null;

  // Scroll management
  aiSessionContainerRef: React.RefObject<HTMLDivElement | null>;
  isScrolledUpFromBottom: boolean;
  onHandleScroll: (container: HTMLElement) => void;

  // Callbacks
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onToggleCommand: (cmdKey: string) => void;
  onSetContentModal: (data: { filePath: string; content: string }) => void;
  onOpenFileAsTab: (filePath: string, content: string) => void;
}

export const AISessionTab = memo(function AISessionTab({
  chatMessages,
  realtimeMessages,
  currentAssistantMessage,
  currentToolUse,
  expandedCommands,
  latestSession,
  isStartingSession,
  isWaitingForResponse,
  isTyping,
  isWsConnected,
  isSessionLive,
  pendingApprovals,
  processingApproval,
  aiSessionContainerRef,
  isScrolledUpFromBottom,
  onHandleScroll,
  onApproveRequest,
  onRejectRequest,
  onToggleCommand,
  onSetContentModal,
  onOpenFileAsTab,
}: AISessionTabProps) {
  // Message Deduplication + merge + stable sort (memoized for performance)
  // Avoid rebuilding Set, filtering, and sorting on every render
  const apiContentSet = useMemo(
    () => new Set(chatMessages.map((m) => m.content)),
    [chatMessages]
  );

  const uniqueRealtimeMessages = useMemo(
    () => realtimeMessages.filter((m) => !apiContentSet.has(m.content)),
    [realtimeMessages, apiContentSet]
  );

  // Backend returns messages sorted by timestamp ASC (chronological)
  // Realtime messages are newer, so appending maintains order
  const allMessages = useMemo(
    () => [...chatMessages, ...uniqueRealtimeMessages],
    [chatMessages, uniqueRealtimeMessages]
  );

  // Merge streaming message into list as temporary last item (single scroll block UX)
  const displayMessages = useMemo(() => {
    if (!currentAssistantMessage) return allMessages;
    return [
      ...allMessages,
      {
        id: 'streaming-temp',
        role: 'assistant' as const,
        content: currentAssistantMessage,
        isStreaming: true,
      },
    ];
  }, [allMessages, currentAssistantMessage]);

  const hasMessages = displayMessages.length > 0;

  // Virtualization state - react-window v2 API
  const listRef = useListRef();

  // Container ref and width state for responsive List sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  // ResizeObserver to track container width for react-window List
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    // Set initial width
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Dynamic row height measurement (react-window v2 pattern)
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 120 });

  // Shared row props - memoized to prevent Row re-renders (rerender-memo pattern)
  // Uses displayMessages (includes streaming) for unified single-block rendering
  const rowProps = useMemo<MessageRowProps>(
    () => ({
      allMessages: displayMessages,
      expandedCommands,
      onToggleCommand,
      onSetContentModal,
      onOpenFileAsTab,
      rowHeight,
    }),
    [displayMessages, expandedCommands, onToggleCommand, onSetContentModal, onOpenFileAsTab, rowHeight]
  );

  // Sync parent ref with List's scroll element for scroll restoration
  // Using Object.assign to bypass ESLint's immutability check on refs
  useEffect(() => {
    const el = listRef.current?.element;
    if (el && aiSessionContainerRef && 'current' in aiSessionContainerRef) {
      Object.assign(aiSessionContainerRef, { current: el });
    }
  }, [listRef, aiSessionContainerRef, displayMessages.length]); // Re-sync when messages change

  // Scroll Management - use List v2 API for virtualized scrolling
  const scrollToBottom = useCallback(() => {
    if (listRef.current && displayMessages.length > 0) {
      listRef.current.scrollToRow({ index: displayMessages.length - 1, align: 'end' });
    }
  }, [displayMessages.length, listRef]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      {/* Non-scrolling indicators ABOVE virtualized list */}
      {isStartingSession && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Starting session...</span>
        </div>
      )}

      {/* Pending Approval Requests ABOVE virtualized list */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-2 mb-2">
          {pendingApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={() => onApproveRequest(approval.id)}
              onReject={() => onRejectRequest(approval.id)}
              isProcessing={processingApproval === approval.id}
            />
          ))}
        </div>
      )}

      {/* Empty States OR Virtualized Message List */}
      {!latestSession ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bot className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No AI session for this task</p>
          <p className="text-xs mt-1">Start the task to begin an AI session</p>
        </div>
      ) : !hasMessages && pendingApprovals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <List
          listRef={listRef}
          style={{ height: 400, width: containerWidth }}
          rowCount={displayMessages.length}
          rowHeight={rowHeight}
          rowComponent={MessageRow}
          rowProps={rowProps}
          overscanCount={3}
          onScroll={() => {
            // Get scroll element from list ref for parent scroll tracking
            const el = listRef.current?.element;
            if (el) {
              onHandleScroll(el);
            }
          }}
        />
      )}

      {/* Current tool in use BELOW virtualized list */}
      {currentToolUse && (
        <div className="mt-2 bg-muted/30 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Wrench className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-medium">{currentToolUse.name}</span>
          </div>
          {currentToolUse.input && Object.keys(currentToolUse.input).length > 0 && (
            <pre className="text-[10px] text-muted-foreground/80 max-h-[80px] overflow-auto whitespace-pre-wrap">
              {JSON.stringify(currentToolUse.input, null, 2).slice(0, 500)}
            </pre>
          )}
        </div>
      )}

      {/* Waiting indicator BELOW virtualized list */}
      {isWaitingForResponse && !currentAssistantMessage && !currentToolUse && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>AI is thinking...</span>
        </div>
      )}
      {isTyping && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <span>Thinking...</span>
        </div>
      )}

      {/* Connection indicator BELOW virtualized list */}
      {isSessionLive && !isStartingSession && (
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded text-xs mt-2",
            isWsConnected ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isWsConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )}
          />
          {isWsConnected ? "Connected - Ready for chat" : "Connecting to session..."}
        </div>
      )}

      {/* "New messages" indicator button */}
      {isScrolledUpFromBottom && displayMessages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-sm font-medium z-10 animate-in fade-in slide-in-from-bottom-2"
        >
          <span>New messages</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
});
