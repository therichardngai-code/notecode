/**
 * Diff File Card component - displays a file's diff with approval controls
 * Shows file header, chunks, and approve/reject buttons
 */

import { FileCode, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { UIDiff } from '@/shared/types';

export interface DiffFileCardProps {
  diff: UIDiff;
  approval?: 'approved' | 'rejected' | null;
  onApprove?: (diffId: string) => void;
  onReject?: (diffId: string) => void;
  onFileClick?: (diffId: string) => void;
  maxHeight?: string;
}

export function DiffFileCard({
  diff,
  approval,
  onApprove,
  onReject,
  onFileClick,
  maxHeight = '300px',
}: DiffFileCardProps) {
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        approval === 'approved' && 'border-green-500/50',
        approval === 'rejected' && 'border-red-500/50',
        !approval && 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
        <button
          onClick={() => onFileClick?.(diff.id)}
          className="flex items-center gap-2 flex-1 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors cursor-pointer"
        >
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{diff.filename}</span>
          {approval === 'approved' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">
              Approved
            </span>
          )}
          {approval === 'rejected' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">
              Rejected
            </span>
          )}
        </button>
        <span className="text-xs text-green-500">+{diff.additions}</span>
        {diff.deletions > 0 && <span className="text-xs text-red-500">-{diff.deletions}</span>}
        {onFileClick && (
          <button
            onClick={() => onFileClick(diff.id)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View file details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        {onApprove && (
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(diff.id); }}
            className={cn(
              'p-1.5 rounded transition-colors',
              approval === 'approved'
                ? 'bg-green-500/20 text-green-500'
                : 'hover:bg-green-500/10 text-muted-foreground hover:text-green-500'
            )}
            title="Approve changes"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
        )}
        {onReject && (
          <button
            onClick={(e) => { e.stopPropagation(); onReject(diff.id); }}
            className={cn(
              'p-1.5 rounded transition-colors',
              approval === 'rejected'
                ? 'bg-red-500/20 text-red-500'
                : 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500'
            )}
            title="Reject changes"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Diff Content */}
      <div className="overflow-y-auto bg-background font-mono text-xs" style={{ maxHeight }}>
        {diff.chunks.map((chunk, idx) => (
          <div key={idx}>
            <div className="px-3 py-1 bg-muted/30 text-muted-foreground border-b border-border/50">
              {chunk.header}
            </div>
            {chunk.lines.map((line, lineIdx) => (
              <div
                key={lineIdx}
                className={cn(
                  'px-3 py-0.5 flex items-start gap-3',
                  line.type === 'add' && 'bg-green-500/10',
                  line.type === 'remove' && 'bg-red-500/10'
                )}
              >
                <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">
                  {line.lineNum}
                </span>
                <span
                  className={cn(
                    'w-4 shrink-0',
                    line.type === 'add' && 'text-green-500',
                    line.type === 'remove' && 'text-red-500'
                  )}
                >
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <span
                  className={cn(
                    'flex-1 break-all',
                    line.type === 'add' && 'text-green-400',
                    line.type === 'remove' && 'text-red-400',
                    line.type === 'context' && 'text-foreground/80'
                  )}
                >
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Diff Stats Summary - shows total files changed with additions/deletions
 */
export interface DiffStatsSummaryProps {
  diffs: UIDiff[];
}

export function DiffStatsSummary({ diffs }: DiffStatsSummaryProps) {
  if (diffs.length === 0) return null;

  const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
      <span>{diffs.length} file{diffs.length > 1 ? 's' : ''} changed,</span>
      <span className="text-green-500">+{totalAdditions}</span>
      <span className="text-red-500">-{totalDeletions}</span>
    </div>
  );
}
