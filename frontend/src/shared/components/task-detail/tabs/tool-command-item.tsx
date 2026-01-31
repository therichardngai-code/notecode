import { memo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  CheckCircle,
  FileCode,
  Globe,
  Copy,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ToolCommand } from '@/shared/types/task-detail-types';

interface ToolCommandItemProps {
  command: ToolCommand;
  messageId: string;
  index: number;
  isExpanded: boolean;
  onToggle: (cmdKey: string) => void;
  onSetContentModal: (data: { filePath: string; content: string }) => void;
  onOpenFileAsTab: (filePath: string, content: string) => void;
}

export const ToolCommandItem = memo(function ToolCommandItem({
  command: cmd,
  messageId,
  index: idx,
  isExpanded,
  onToggle,
  onSetContentModal,
  onOpenFileAsTab,
}: ToolCommandItemProps) {
  const cmdKey = `${messageId}-${idx}`;
  const hasInput = cmd.input && Object.keys(cmd.input).length > 0;

  return (
    <div className="bg-muted/30 rounded text-xs font-mono overflow-hidden">
      <button
        onClick={() => hasInput && onToggle(cmdKey)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1",
          hasInput && "hover:bg-muted/50 cursor-pointer"
        )}
      >
        {hasInput ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )
        ) : (
          <Terminal className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="flex-1 text-foreground text-left">{cmd.cmd}</span>
        {cmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
      </button>

      {isExpanded && cmd.input && (
        <div className="px-3 py-2 border-t border-border/50 bg-background/50 space-y-1">
          {/* File path - Read, Write, Edit, Glob */}
          {'file_path' in cmd.input && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCode className="w-3 h-3 shrink-0" />
              <span className="truncate">{String(cmd.input.file_path)}</span>
            </div>
          )}

          {/* Query - WebSearch */}
          {'query' in cmd.input && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{String(cmd.input.query)}</span>
            </div>
          )}

          {/* Command - Bash */}
          {'command' in cmd.input && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Terminal className="w-3 h-3 shrink-0 mt-0.5" />
              <code className="text-[10px] break-all">{String(cmd.input.command)}</code>
            </div>
          )}

          {/* Pattern - Grep, Glob */}
          {'pattern' in cmd.input && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-[10px] font-medium">Pattern:</span>
              <code className="text-[10px]">{String(cmd.input.pattern)}</code>
            </div>
          )}

          {/* URL - WebFetch */}
          {'url' in cmd.input && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate text-[10px]">{String(cmd.input.url)}</span>
            </div>
          )}

          {/* Content - Write, Edit with action buttons */}
          {'content' in cmd.input && (
            <div className="mt-1">
              <div className="flex items-center justify-end gap-1 mb-1">
                <button
                  onClick={() => navigator.clipboard.writeText(String(cmd.input?.content))}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Copy content"
                >
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() =>
                    onSetContentModal({
                      filePath: cmd.input && 'file_path' in cmd.input ? String(cmd.input.file_path) : 'Content',
                      content: String(cmd.input?.content),
                    })
                  }
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="View in modal"
                >
                  <Eye className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => {
                    const filePath = cmd.input && 'file_path' in cmd.input ? String(cmd.input.file_path) : 'Content';
                    onOpenFileAsTab(filePath, String(cmd.input?.content));
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <pre className="p-2 bg-muted/50 rounded text-[10px] max-h-[120px] overflow-auto whitespace-pre-wrap text-foreground/80">
                {String(cmd.input.content).slice(0, 500)}
                {String(cmd.input.content).length > 500 ? '...' : ''}
              </pre>
            </div>
          )}

          {/* Todos - TodoWrite */}
          {'todos' in cmd.input && Array.isArray(cmd.input.todos) && (
            <div className="space-y-1">
              {(cmd.input.todos as Array<{ content?: string; status?: string }>)
                .slice(0, 5)
                .map((todo, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        todo.status === 'completed'
                          ? 'bg-green-500'
                          : todo.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      )}
                    />
                    <span className="truncate">{todo.content}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Fallback: show raw JSON if no known fields */}
          {!(
            'file_path' in cmd.input ||
            'query' in cmd.input ||
            'command' in cmd.input ||
            'pattern' in cmd.input ||
            'url' in cmd.input ||
            'content' in cmd.input ||
            'todos' in cmd.input
          ) && (
            <pre className="text-[10px] text-muted-foreground/80 max-h-[80px] overflow-auto whitespace-pre-wrap">
              {JSON.stringify(cmd.input, null, 2).slice(0, 300)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
});
