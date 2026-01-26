import { FileCode, CheckCircle, XCircle } from 'lucide-react';
import type { Approval } from '../../../domain/entities';
import { DiffViewer } from './DiffViewer';
import { ApprovalActions } from './ApprovalActions';

interface DiffApprovalProps {
  approval: Approval;
  onApproved?: () => void;
  onRejected?: () => void;
  showActions?: boolean;
}

export function DiffApproval({ approval, onApproved, onRejected, showActions = true }: DiffApprovalProps) {
  if (approval.type !== 'diff' || approval.payload.type !== 'diff') {
    return null;
  }

  const { filePath, hunks } = approval.payload;
  const isPending = approval.status === 'pending';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileCode className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">File Change</span>

        {/* Status badge */}
        {approval.status === 'approved' && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium ml-auto">
            <CheckCircle className="w-3 h-3" />
            <span>Approved</span>
          </div>
        )}
        {approval.status === 'rejected' && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium ml-auto">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </div>
        )}
      </div>

      {/* Diff viewer */}
      <DiffViewer hunks={hunks} filePath={filePath} />

      {/* Actions */}
      {isPending && showActions && (
        <ApprovalActions
          approvalId={approval.id}
          onApproved={onApproved}
          onRejected={onRejected}
          showComment={true}
        />
      )}

      {/* Decision info */}
      {!isPending && approval.decidedAt && (
        <div className="text-xs text-muted-foreground">
          <span>
            {approval.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
            {approval.decidedBy || 'Unknown'} on{' '}
            {new Date(approval.decidedAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
