import { memo } from 'react';
import { FileCode } from 'lucide-react';
import { MarkdownMessage } from '@/shared/components/ui/markdown-message';
import { ToolCommandItem } from './tool-command-item';
import type { ChatMessage } from '@/shared/types/task-detail-types';

interface ChatMessageItemProps {
  message: ChatMessage;
  expandedCommands: Set<string>;
  onToggleCommand: (cmdKey: string) => void;
  onSetContentModal: (data: { filePath: string; content: string }) => void;
  onOpenFileAsTab: (filePath: string, content: string) => void;
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  expandedCommands,
  onToggleCommand,
  onSetContentModal,
  onOpenFileAsTab,
}: ChatMessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-muted border border-border rounded-full px-4 py-2 text-sm text-foreground max-w-[80%]">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="mb-6">
      <MarkdownMessage content={message.content} className="text-sm text-foreground" />

      {/* File metadata display */}
      {message.files &&
        message.files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground"
          >
            <FileCode className="w-3 h-3" />
            <span className="flex-1">{file.name}</span>
            {file.additions !== undefined && <span className="text-green-500">+{file.additions}</span>}
            {file.deletions !== undefined && file.deletions > 0 && (
              <span className="text-red-500">-{file.deletions}</span>
            )}
          </div>
        ))}

      {/* Tool commands with expandable details */}
      {message.commands && message.commands.length > 0 && (
        <div className="space-y-1 mt-2">
          {message.commands.map((cmd, idx) => (
            <ToolCommandItem
              key={idx}
              command={cmd}
              messageId={message.id}
              index={idx}
              isExpanded={expandedCommands.has(`${message.id}-${idx}`)}
              onToggle={onToggleCommand}
              onSetContentModal={onSetContentModal}
              onOpenFileAsTab={onOpenFileAsTab}
            />
          ))}
        </div>
      )}
    </div>
  );
});
