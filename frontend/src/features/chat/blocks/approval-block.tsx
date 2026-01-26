import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { ApprovalBlock } from '../../../domain/entities';

interface ApprovalBlockComponentProps {
  block: ApprovalBlock;
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string) => void;
}

export function ApprovalBlockComponent({
  block,
  onApprove,
  onReject,
}: ApprovalBlockComponentProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const timeout = new Date(block.timeoutAt).getTime();
      const remaining = Math.max(0, Math.floor((timeout - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [block.timeoutAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const categoryColors = {
    safe: 'border-green-500/30 bg-green-500/5',
    'requires-approval': 'border-yellow-500/30 bg-yellow-500/5',
    dangerous: 'border-red-500/30 bg-red-500/5',
  };

  const categoryIcons = {
    safe: CheckCircle,
    'requires-approval': AlertTriangle,
    dangerous: XCircle,
  };

  const Icon = categoryIcons[block.toolCategory];

  return (
    <div
      className={`approval-block border rounded-lg p-4 my-2 ${categoryColors[block.toolCategory]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{block.toolName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {block.toolCategory}
              </span>
            </div>
            <p className="text-sm text-foreground">{block.summary}</p>
          </div>
        </div>

        {block.status === 'pending' && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onReject?.(block.approvalId)}
                className="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove?.(block.approvalId)}
                className="px-3 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        )}

        {block.status === 'approved' && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium shrink-0">
            <CheckCircle className="w-3 h-3" />
            <span>Approved</span>
          </div>
        )}

        {block.status === 'rejected' && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium shrink-0">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </div>
        )}

        {block.status === 'timeout' && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium shrink-0">
            <Clock className="w-3 h-3" />
            <span>Timeout</span>
          </div>
        )}
      </div>
    </div>
  );
}
