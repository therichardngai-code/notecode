import { useMemo, useState, useCallback } from 'react';
import { X, Bot, GitBranch, MessageSquare, FileCode, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { ChatMessageItem } from './tabs/chat-message-item';
import { cn } from '@/shared/lib/utils';
import type { ChatMessage, UIDiff } from '@/shared/types';
import type { TaskStatus } from '@/adapters/api/tasks-api';

interface FileDetailsPanelProps {
  selectedDiffFile: string | null;
  isSubPanelOpen: boolean;
  subPanelTab: 'chat-session' | 'diffs';
  chatMessages: ChatMessage[];
  realtimeMessages: ChatMessage[];
  currentAssistantMessage: string;
  sessionDiffs: UIDiff[];
  diffApprovals: Record<string, 'approved' | 'rejected' | null>;
  taskStatus?: TaskStatus;
  fixedWidth?: number;
  onCloseFileDetails: () => void;
  onSetSubPanelTab: (tab: 'chat-session' | 'diffs') => void;
  onApproveDiff: (diffId: string) => void;
  onRejectDiff: (diffId: string) => void;
  onSetContentModal?: (data: { filePath: string; content: string }) => void;
  onOpenFileAsTab?: (filePath: string, content: string) => void;
}

export function FileDetailsPanel({
  selectedDiffFile,
  isSubPanelOpen,
  subPanelTab,
  chatMessages,
  realtimeMessages,
  currentAssistantMessage,
  sessionDiffs,
  diffApprovals,
  taskStatus,
  fixedWidth,
  onCloseFileDetails,
  onSetSubPanelTab,
  onApproveDiff,
  onRejectDiff,
  onSetContentModal,
  onOpenFileAsTab,
}: FileDetailsPanelProps) {
  const isReviewMode = taskStatus === 'review';

  // Local state for expanded commands (tool use blocks)
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());

  const toggleCommand = useCallback((key: string) => {
    setExpandedCommands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Fallback no-op handlers if not provided
  const handleSetContentModal = useCallback((data: { filePath: string; content: string }) => {
    onSetContentModal?.(data);
  }, [onSetContentModal]);

  const handleOpenFileAsTab = useCallback((filePath: string, content: string) => {
    onOpenFileAsTab?.(filePath, content);
  }, [onOpenFileAsTab]);

  // Backend returns messages sorted by timestamp ASC (chronological)
  // Realtime messages are newer, so appending maintains order
  const { allChatMessages, hasChatMessages } = useMemo(() => {
    const apiContentSet = new Set(chatMessages.map((m) => m.content));
    const uniqueRealtimeMessages = realtimeMessages.filter((m) => !apiContentSet.has(m.content));
    const merged = [...chatMessages, ...uniqueRealtimeMessages];

    return {
      allChatMessages: merged,
      hasChatMessages: merged.length > 0 || currentAssistantMessage,
    };
  }, [chatMessages, realtimeMessages, currentAssistantMessage]);

  if (!selectedDiffFile && !isSubPanelOpen) return null;

  return (
    <div
      className={cn("border-l border-border flex flex-col glass-strong", !fixedWidth && "flex-1")}
      style={fixedWidth ? { width: fixedWidth } : undefined}
    >
      {/* File Details Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">File Details</span>
        <button onClick={onCloseFileDetails} className="p-1 rounded hover:bg-muted transition-colors" title="Close">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* File Details Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
        <button onClick={() => onSetSubPanelTab('chat-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'chat-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
          <Bot className="w-3.5 h-3.5" />Chat Session
        </button>
        <button onClick={() => onSetSubPanelTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
          <GitBranch className="w-3.5 h-3.5" />Diffs
        </button>
      </div>

      {/* File Details Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {subPanelTab === 'chat-session' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground mb-3">AI Session Messages</h3>
              {!hasChatMessages ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <>
                  {allChatMessages.map((message) => (
                    <div key={message.id} className="py-2">
                      <ChatMessageItem
                        message={message}
                        expandedCommands={expandedCommands}
                        onToggleCommand={toggleCommand}
                        onSetContentModal={handleSetContentModal}
                        onOpenFileAsTab={handleOpenFileAsTab}
                      />
                    </div>
                  ))}

                  {/* Show streaming assistant message */}
                  {currentAssistantMessage && (
                    <div className="py-2">
                      <ChatMessageItem
                        message={{
                          id: 'streaming-temp',
                          role: 'assistant',
                          content: currentAssistantMessage,
                          isStreaming: true,
                        }}
                        expandedCommands={expandedCommands}
                        onToggleCommand={toggleCommand}
                        onSetContentModal={handleSetContentModal}
                        onOpenFileAsTab={handleOpenFileAsTab}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {subPanelTab === 'diffs' && (
            <div>
              {/* REVIEW mode alert */}
              {isReviewMode && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm mb-4">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Task is in Review</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Individual diff actions are disabled. Use the Git tab to approve or reject all changes together.
                    </p>
                  </div>
                </div>
              )}
              {sessionDiffs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileCode className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No code changes yet</p>
                </div>
              ) : sessionDiffs.filter(diff => !selectedDiffFile || diff.id === selectedDiffFile).map((diff) => (
                <div key={diff.id}>
                  {/* File Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border flex-wrap">
                    <FileCode className="w-5 h-5 text-muted-foreground" />
                    <span className="text-base font-medium text-foreground">{diff.filename}</span>
                    {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 font-medium">✓ Approved</span>}
                    {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-600 font-medium">✗ Rejected</span>}
                    <span className="text-sm text-green-500 ml-auto">+{diff.additions}</span>
                    {diff.deletions > 0 && <span className="text-sm text-red-500">-{diff.deletions}</span>}
                    {!isReviewMode && (
                      <div className="flex items-center gap-2 ml-2">
                        <button onClick={() => onApproveDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500 text-white" : "bg-green-500/10 text-green-600 hover:bg-green-500/20")}>
                          <ThumbsUp className="w-4 h-4" />Approve
                        </button>
                        <button onClick={() => onRejectDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500 text-white" : "bg-red-500/10 text-red-600 hover:bg-red-500/20")}>
                          <ThumbsDown className="w-4 h-4" />Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Diff Content */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    {diff.chunks.map((chunk, chunkIdx) => (
                      <div key={chunkIdx} className="font-mono text-xs">
                        <div className="px-3 py-2 bg-muted/30 text-muted-foreground border-b border-border/50 sticky top-0">{chunk.header}</div>
                        <div className="bg-background">
                          {chunk.lines.map((line, lineIdx) => (
                            <div key={lineIdx} className={cn("px-3 py-1 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'remove' && "bg-red-500/10")}>
                              <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                              <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'remove' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                              <span className={cn("flex-1 break-all", line.type === 'add' && "text-green-400", line.type === 'remove' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
