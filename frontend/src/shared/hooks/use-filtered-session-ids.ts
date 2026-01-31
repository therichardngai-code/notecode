import { useMemo, useRef } from 'react';
import type { Session } from '@/adapters/api/sessions-api';
import { getFilteredSessionIds } from '@/shared/utils/session-chain';

interface FilteredSessionIdsParams {
  latestSession: Session | undefined;
  sessions: Session[];
}

export function useFilteredSessionIds({
  latestSession,
  sessions,
}: FilteredSessionIdsParams) {
  const previousProviderSessionIdRef = useRef<string | null>(null);
  const stableFilterSessionIds = useRef<string[] | null>(null);

  const filterSessionIds = useMemo(() => {
    if (!latestSession) return null;

    const currentProviderSessionId = latestSession.providerSessionId;

    // Structural sharing optimization: reuse previous filter if providerSessionId unchanged
    if (currentProviderSessionId && currentProviderSessionId === previousProviderSessionIdRef.current) {
      return stableFilterSessionIds.current;
    }

    // ProviderSessionId changed - recalculate filter
    const newFilter = getFilteredSessionIds(latestSession, sessions);
    previousProviderSessionIdRef.current = currentProviderSessionId;
    stableFilterSessionIds.current = newFilter;
    return newFilter;
  }, [latestSession, sessions]);

  return filterSessionIds;
}
