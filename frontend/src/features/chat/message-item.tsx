import type { Message } from '../../domain/entities';
import { BlockRenderer } from './blocks/block-renderer';

interface MessageItemProps {
  message: Message;
  onApprove?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
  onFileClick?: (path: string) => void;
}

export function MessageItem({ message, onApprove, onReject, onFileClick }: MessageItemProps) {
  const roleColors = {
    user: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    assistant: 'bg-muted border-border',
    system: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    tool: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  const roleLabels = {
    user: 'You',
    assistant: 'Assistant',
    system: 'System',
    tool: message.toolName || 'Tool',
  };

  return (
    <div className={`message-item border rounded-lg p-4 ${roleColors[message.role]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-foreground">
          {roleLabels[message.role]}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="message-blocks space-y-2">
        {message.blocks.map((block, idx) => (
          <BlockRenderer
            key={idx}
            block={block}
            onApprove={onApprove}
            onReject={onReject}
            onFileClick={onFileClick}
          />
        ))}
      </div>

      {message.tokenCount !== undefined && (
        <div className="mt-2 text-xs text-muted-foreground">
          Tokens: {message.tokenCount}
        </div>
      )}
    </div>
  );
}
