/**
 * Approval Card component - shows pending tool approval with countdown
 * Used in AI Session tab for tool approval requests
 */

import { useState, useEffect } from 'react';
import { Clock, FileCode, Terminal, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ApprovalRequest } from '@/adapters/api/sessions-api';

export interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isProcessing,
}: ApprovalCardProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const isDangerous = approval.toolCategory === 'dangerous';
  const { toolName, toolInput } = approval.payload;

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, new Date(approval.timeoutAt).getTime() - Date.now());
      setTimeLeft(Math.floor(remaining / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [approval.timeoutAt]);

  return (
    <div
      className={cn(
        'border rounded-lg p-3 mb-4',
        isDangerous ? 'border-red-500/50 bg-red-500/5' : 'border-yellow-500/50 bg-yellow-500/5'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {isDangerous ? (
          <ShieldAlert className="w-4 h-4 text-red-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
        <span className={cn('text-sm font-medium', isDangerous ? 'text-red-500' : 'text-yellow-600')}>
          {isDangerous ? 'Dangerous Operation' : 'Approval Required'}
        </span>
        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeLeft}s
        </span>
      </div>

      <div className="text-sm text-foreground mb-2">
        <span className="font-medium">{toolName}</span>
        {toolInput.file_path && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <FileCode className="w-3 h-3" />
            <span className="truncate">{toolInput.file_path}</span>
          </div>
        )}
        {toolInput.command && (
          <div className="flex items-center gap-1 mt-1 text-xs font-mono bg-muted/50 px-2 py-1 rounded">
            <Terminal className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{toolInput.command}</span>
          </div>
        )}
        {toolInput.content && (
          <pre className="mt-2 p-2 bg-muted/50 rounded text-[10px] max-h-[80px] overflow-auto whitespace-pre-wrap text-foreground/80">
            {toolInput.content.slice(0, 500)}
            {toolInput.content.length > 500 ? '...' : ''}
          </pre>
        )}
      </div>

      {isDangerous && (
        <p className="text-xs text-red-500/80 mb-2">
          This operation may affect sensitive files or perform destructive actions.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onReject}
          disabled={isProcessing || timeLeft === 0}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-border bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={isProcessing || timeLeft === 0}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50',
            isDangerous ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isDangerous ? 'Approve Anyway' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
