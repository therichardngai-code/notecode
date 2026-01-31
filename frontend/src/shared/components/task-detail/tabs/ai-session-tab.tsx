import { memo, useCallback } from 'react';
import { Bot, MessageSquare, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ApprovalCard } from '../approval-card';
import { MarkdownMessage } from '@/shared/components/ui/markdown-message';
import { ChatMessageItem } from './chat-message-item';
import type { Session, ApprovalRequest } from '@/adapters/api/sessions-api';
import type { ChatMessage } from '@/shared/types/task-detail-types';
import type { ToolUseBlock } from '@/shared/hooks';

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
  // Message Deduplication
  const apiContentSet = new Set(chatMessages.map((m) => m.content));
  const uniqueRealtimeMessages = realtimeMessages.filter((m) => !apiContentSet.has(m.content));
  const allMessages = [...chatMessages, ...uniqueRealtimeMessages].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : Date.now();
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : Date.now();
    return timeA - timeB;
  });
  const hasMessages = allMessages.length > 0 || currentAssistantMessage;

  // Scroll Management
  const scrollToBottom = useCallback(() => {
    if (aiSessionContainerRef.current) {
      aiSessionContainerRef.current.scrollTop = aiSessionContainerRef.current.scrollHeight;
    }
  }, [aiSessionContainerRef]);

  return (
    <div className="relative">
      <div
        ref={aiSessionContainerRef}
        className="space-y-4 max-h-[400px] overflow-y-auto"
        onScroll={(e) => {
          onHandleScroll(e.currentTarget);
        }}
      >
        {/* Session Starting Indicator */}
        {isStartingSession && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Starting session...</span>
          </div>
        )}

        {/* Pending Approval Requests */}
        {pendingApprovals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={() => onApproveRequest(approval.id)}
            onReject={() => onRejectRequest(approval.id)}
            isProcessing={processingApproval === approval.id}
          />
        ))}

        {/* Empty States */}
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
          allMessages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              expandedCommands={expandedCommands}
              onToggleCommand={onToggleCommand}
              onSetContentModal={onSetContentModal}
              onOpenFileAsTab={onOpenFileAsTab}
            />
          ))
        )}

        {/* Streaming assistant message */}
        {currentAssistantMessage && (
          <div className="mb-6">
            <MarkdownMessage content={currentAssistantMessage} className="text-sm text-foreground" />
            <span className="inline-block w-2 h-4 bg-primary animate-pulse mt-1" />
          </div>
        )}

        {/* Current tool in use */}
        {currentToolUse && (
          <div className="mb-4 bg-muted/30 rounded-lg p-3 border border-border/50">
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

        {/* Waiting indicator */}
        {isWaitingForResponse && !currentAssistantMessage && !currentToolUse && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Thinking...</span>
          </div>
        )}

        {/* Connection indicator */}
        {isSessionLive && !isStartingSession && (
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
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
      </div>

      {/* "New messages" indicator button */}
      {isScrolledUpFromBottom && (allMessages.length > 0 || currentAssistantMessage) && (
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
