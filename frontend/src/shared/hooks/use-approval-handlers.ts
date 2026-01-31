import { sessionsApi, type ApprovalRequest } from '@/adapters/api/sessions-api';

interface ApprovalHandlersParams {
  isWsConnected: boolean;
  isSessionLive: boolean;
  sendApprovalResponse: (approvalId: string, approved: boolean) => void;
  setPendingApprovals: React.Dispatch<React.SetStateAction<ApprovalRequest[]>>;
  setProcessingApproval: React.Dispatch<React.SetStateAction<string | null>>;
}

interface UseApprovalHandlersReturn {
  handleApproveRequest: (id: string) => Promise<void>;
  handleRejectRequest: (id: string) => Promise<void>;
}

/**
 * Creates approval/rejection handlers with DRY pattern.
 *
 * Features:
 * - Handles approve/reject via WebSocket (preferred) or HTTP fallback
 * - Optimistic UI updates
 * - Shared logic for both approve and reject actions
 *
 * Note: Call this AFTER useTaskWebSocket to receive sendApprovalResponse
 *
 * @param isWsConnected - WebSocket connection state
 * @param isSessionLive - Session running state
 * @param sendApprovalResponse - WebSocket approval sender
 * @param setPendingApprovals - State setter for optimistic updates
 * @param setProcessingApproval - State setter for loading state
 */
export function useApprovalHandlers({
  isWsConnected,
  isSessionLive,
  sendApprovalResponse,
  setPendingApprovals,
  setProcessingApproval,
}: ApprovalHandlersParams): UseApprovalHandlersReturn {
  // Internal: Handle approval/rejection with DRY pattern
  const handleApproval = async (
    approvalId: string,
    approved: boolean
  ): Promise<void> => {
    setProcessingApproval(approvalId);
    try {
      // Use WebSocket if connected and session live, fallback to HTTP
      if (isWsConnected && isSessionLive) {
        sendApprovalResponse(approvalId, approved);
      } else {
        await (approved
          ? sessionsApi.approveRequest(approvalId)
          : sessionsApi.rejectRequest(approvalId)
        );
      }
      // Optimistically remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
    } catch (err) {
      console.error(`Failed to ${approved ? 'approve' : 'reject'}:`, err);
    } finally {
      setProcessingApproval(null);
    }
  };

  // Public API - thin wrappers for semantic clarity
  const handleApproveRequest = (id: string): Promise<void> => handleApproval(id, true);
  const handleRejectRequest = (id: string): Promise<void> => handleApproval(id, false);

  return {
    handleApproveRequest,
    handleRejectRequest,
  };
}
