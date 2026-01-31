import { memo } from 'react';
import { GitBranch, FileCode, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session } from '@/adapters/api/sessions-api';
import type { UIDiff } from '@/shared/types/task-detail-types';

interface DiffsTabProps {
  latestSession: Session | undefined;
  sessionDiffs: UIDiff[];
  diffApprovals: Record<string, 'approved' | 'rejected' | null>;
  onDiffFileClick: (diffId: string) => void;
  onApproveDiff: (diffId: string) => void;
  onRejectDiff: (diffId: string) => void;
}

export const DiffsTab = memo(function DiffsTab({
  latestSession,
  sessionDiffs,
  diffApprovals,
  onDiffFileClick,
  onApproveDiff,
  onRejectDiff,
}: DiffsTabProps) {
  if (!latestSession) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <GitBranch className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No diffs available</p>
          <p className="text-xs mt-1">Start the task to see code changes</p>
        </div>
      </div>
    );
  }

  if (sessionDiffs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <FileCode className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No code changes yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <span>{sessionDiffs.length} file{sessionDiffs.length > 1 ? 's' : ''} changed,</span>
        <span className="text-green-500">+{sessionDiffs.reduce((sum, d) => sum + d.additions, 0)}</span>
        <span className="text-red-500">-{sessionDiffs.reduce((sum, d) => sum + d.deletions, 0)}</span>
      </div>
      {sessionDiffs.map((diff) => (
        <div key={diff.id} className={cn("border rounded-lg overflow-hidden", diffApprovals[diff.id] === 'approved' && "border-green-500/50", diffApprovals[diff.id] === 'rejected' && "border-red-500/50", !diffApprovals[diff.id] && "border-border")}>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
            <button onClick={() => onDiffFileClick(diff.id)} className="flex items-center gap-2 flex-1 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors cursor-pointer">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{diff.filename}</span>
              {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">Approved</span>}
              {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">Rejected</span>}
            </button>
            <span className="text-xs text-green-500">+{diff.additions}</span>
            {diff.deletions > 0 && <span className="text-xs text-red-500">-{diff.deletions}</span>}
            <button onClick={() => onDiffFileClick(diff.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View file details"><ExternalLink className="w-3.5 h-3.5" /></button>
            <button onClick={() => onApproveDiff(diff.id)} className={cn("p-1.5 rounded", diffApprovals[diff.id] === 'approved' ? "bg-green-500/20 text-green-500" : "hover:bg-green-500/10 text-muted-foreground hover:text-green-500")}><ThumbsUp className="w-3.5 h-3.5" /></button>
            <button onClick={() => onRejectDiff(diff.id)} className={cn("p-1.5 rounded", diffApprovals[diff.id] === 'rejected' ? "bg-red-500/20 text-red-500" : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500")}><ThumbsDown className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-[300px] overflow-y-auto bg-background font-mono text-xs">
            {diff.chunks.map((chunk, idx) => (
              <div key={idx}>
                <div className="px-3 py-1 bg-muted/30 text-muted-foreground border-b border-border/50">{chunk.header}</div>
                {chunk.lines.map((line, lineIdx) => (
                  <div key={lineIdx} className={cn("px-3 py-0.5 flex items-start gap-3", line.type === 'add' && "bg-green-500/10", line.type === 'remove' && "bg-red-500/10")}>
                    <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                    <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500", line.type === 'remove' && "text-red-500", line.type === 'context' && "text-muted-foreground/40")}>{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                    <span className={cn("flex-1", line.type === 'add' && "text-green-400", line.type === 'remove' && "text-red-400", line.type === 'context' && "text-foreground/80")}>{line.content}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
