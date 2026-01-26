import { useState, useEffect } from 'react';
import type { Session, SessionStatus } from '../../../domain/entities';

export interface SessionFilters {
  status?: SessionStatus[];
  projectId?: string[];
  agentId?: string[];
  provider?: string[];
  searchQuery?: string;
}

export function useSessions(filters?: SessionFilters) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: Replace with actual repository call
    // For now, return mock data
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mock sessions data
        const mockSessions: Session[] = [];
        setSessions(mockSessions);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [filters]);

  // Filter sessions based on criteria
  const filteredSessions = sessions.filter((session) => {
    if (filters?.status?.length && !filters.status.includes(session.status)) {
      return false;
    }
    if (filters?.provider?.length && !filters.provider.includes(session.provider)) {
      return false;
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        session.name.toLowerCase().includes(query) ||
        session.workingDir.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return {
    sessions: filteredSessions,
    isLoading,
    error,
    totalCount: sessions.length,
    filteredCount: filteredSessions.length,
  };
}
