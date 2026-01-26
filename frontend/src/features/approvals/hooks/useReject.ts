import { useState } from 'react';

export function useReject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reject = async (approvalId: string, comment?: string) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // await fetch(`/api/approvals/${approvalId}/reject`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ comment }),
      // });

      console.log('Rejected:', approvalId, comment);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reject'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { reject, loading, error };
}
