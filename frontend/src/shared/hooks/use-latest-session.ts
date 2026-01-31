/**
 * Get latest session for a task (by createdAt)
 * Memoized to prevent cascade re-renders
 */

import { useMemo } from 'react';
import { useSessions } from './use-sessions-query';
import type { Session } from '@/adapters/api/sessions-api';

export function useLatestSession(taskId?: string): Session | undefined {
  const { data: sessions = [] } = useSessions({ taskId });

  return useMemo(() => {
    if (!sessions.length) return undefined;

    // Sort by createdAt descending, return first
    return [...sessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [sessions]);
  // ↑ Only recalculates when sessions array reference changes
  // With structural sharing enabled, this is stable
}
