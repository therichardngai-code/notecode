import { useState, useEffect } from 'react';
import type { Session } from '../../../domain/entities';

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    // TODO: Replace with actual repository call
    const loadSession = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mock session data - would come from repository
        setSession(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  return {
    session,
    isLoading,
    error,
  };
}
