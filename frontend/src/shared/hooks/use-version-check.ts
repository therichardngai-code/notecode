/**
 * Version Check Hook
 * React Query hook for version updates
 */

import { useQuery } from '@tanstack/react-query';
import { versionApi } from '@/adapters/api/version-api';

/** Check for version updates (cached 24h) */
export function useVersionCheck() {
  return useQuery({
    queryKey: ['version-check'],
    queryFn: () => versionApi.checkForUpdates(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
}

/** Get current version info */
export function useCurrentVersion() {
  return useQuery({
    queryKey: ['version-current'],
    queryFn: versionApi.getCurrentVersion,
    staleTime: Infinity, // Never stale - version doesn't change
  });
}
