/**
 * Version Check Hook
 * React Query hook for version updates + Electron IPC download state
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { versionApi } from '@/adapters/api/version-api';

/** Download progress state for Electron auto-updater */
export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'downloaded' | 'error';

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

/**
 * Full update manager hook — combines version check + Electron download flow.
 * For npm mode: provides version info + instructions fetch.
 * For Electron mode: provides download/install/progress via IPC.
 */
export function useUpdateManager() {
  const queryClient = useQueryClient();
  const versionQuery = useVersionCheck();
  const isElectron = !!window.electronUpdater;

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Listen to Electron IPC auto-updater events
  useEffect(() => {
    if (!window.electronUpdater) return;

    window.electronUpdater.onChecking(() => {
      setUpdateStatus('checking');
    });

    window.electronUpdater.onProgress((data) => {
      setUpdateStatus('downloading');
      setDownloadProgress(data);
    });

    window.electronUpdater.onDownloaded(() => {
      setUpdateStatus('downloaded');
      setDownloadProgress(null);
    });

    window.electronUpdater.onError((data) => {
      setUpdateStatus('error');
      setErrorMessage(data.message);
    });
  }, []);

  /** Force re-check for updates (bypass cache) */
  const forceCheck = useCallback(() => {
    setUpdateStatus('checking');
    setErrorMessage(null);
    queryClient.invalidateQueries({ queryKey: ['version-check'] });
  }, [queryClient]);

  /** Start downloading update (Electron only) */
  const downloadUpdate = useCallback(() => {
    if (!window.electronUpdater) return;
    setUpdateStatus('downloading');
    setDownloadProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
    window.electronUpdater.download();
  }, []);

  /** Install downloaded update and relaunch (Electron only) */
  const installUpdate = useCallback(() => {
    if (!window.electronUpdater) return;
    window.electronUpdater.install();
  }, []);

  return {
    /** Version check query result */
    versionInfo: versionQuery.data ?? null,
    isLoading: versionQuery.isLoading,
    /** Whether running in Electron mode */
    isElectron,
    /** Current update flow status */
    updateStatus,
    /** Download progress (Electron only) */
    downloadProgress,
    /** Error message if update failed */
    errorMessage,
    /** Force re-check for updates */
    forceCheck,
    /** Start downloading (Electron only) */
    downloadUpdate,
    /** Install and relaunch (Electron only) */
    installUpdate,
  };
}
