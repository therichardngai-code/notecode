import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useApprove } from '../hooks/useApprove';
import { useReject } from '../hooks/useReject';

interface ApprovalActionsProps {
  approvalId: string;
  onApproved?: () => void;
  onRejected?: () => void;
  showComment?: boolean;
  showBulkActions?: boolean;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

export function ApprovalActions({
  approvalId,
  onApproved,
  onRejected,
  showComment = true,
  showBulkActions = false,
  onApproveAll,
  onRejectAll,
}: ApprovalActionsProps) {
  const [comment, setComment] = useState('');
  const { approve, loading: approveLoading } = useApprove();
  const { reject, loading: rejectLoading } = useReject();

  const handleApprove = async () => {
    try {
      await approve(approvalId, comment || undefined);
      setComment('');
      onApproved?.();
    } catch (error) {
      console.error('Approve failed:', error);
    }
  };

  const handleReject = async () => {
    try {
      await reject(approvalId, comment || undefined);
      setComment('');
      onRejected?.();
    } catch (error) {
      console.error('Reject failed:', error);
    }
  };

  const loading = approveLoading || rejectLoading;

  return (
    <div className="space-y-3">
      {showComment && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)..."
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          rows={2}
          disabled={loading}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {approveLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Approve
        </button>

        <button
          onClick={handleReject}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {rejectLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Reject
        </button>

        {showBulkActions && (
          <>
            <div className="flex-1" />
            <button
              onClick={onApproveAll}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-500/10 disabled:opacity-50 rounded-md transition-colors"
            >
              Approve All
            </button>
            <button
              onClick={onRejectAll}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 rounded-md transition-colors"
            >
              Reject All
            </button>
          </>
        )}
      </div>
    </div>
  );
}
