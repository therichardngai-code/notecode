import { useEffect, useRef } from 'react';
import type { Message } from '../../domain/entities';
import { MessageItem } from './message-item';

interface ChatContainerProps {
  messages: Message[];
  onApprove?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
  onFileClick?: (path: string) => void;
  height?: number;
  width?: string | number;
}

export function ChatContainer({
  messages,
  onApprove,
  onReject,
  onFileClick,
  height = 600,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No messages yet. Start a conversation!
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="chat-container bg-muted overflow-y-auto p-4 space-y-4"
      style={{ height: `${height}px` }}
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onApprove={onApprove}
          onReject={onReject}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
