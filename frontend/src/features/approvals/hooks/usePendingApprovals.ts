import { useState, useEffect } from 'react';
import type { Approval } from '../../../domain/entities';

export function usePendingApprovals(sessionId?: string) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/approvals?status=pending${sessionId ? `&sessionId=${sessionId}` : ''}`);
        // const data = await response.json();
        // setApprovals(data);

        // Mock data for now
        setApprovals([]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch approvals'));
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [sessionId]);

  return { approvals, loading, error };
}
