/**
 * Hook to detect Electron environment and access native window controls.
 * Returns noop/defaults when running in a web browser.
 */

import { useState, useEffect } from 'react';

// Global type declaration for Electron preload API
declare global {
  interface Window {
    electronAPI?: {
      selectFolder: (options: { title?: string; defaultPath?: string }) =>
        Promise<{ cancelled: boolean; path: string | null }>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => string;
      isElectron: () => boolean;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChange: (callback: (isMaximized: boolean) => void) => void;
      onBackendUrl: (callback: (url: string) => void) => void;
    };
    /** Electron auto-updater IPC bridge */
    electronUpdater?: {
      check: () => void;
      download: () => void;
      install: () => void;
      onChecking: (cb: () => void) => void;
      onAvailable: (cb: (data: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => void;
      onNotAvailable: (cb: (data: { version: string }) => void) => void;
      onProgress: (cb: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => void;
      onDownloaded: (cb: (data: { version: string; releaseNotes?: string }) => void) => void;
      onError: (cb: (data: { message: string }) => void) => void;
    };
  }
}

const noop = () => {};

export function useElectron() {
  const isElectron = !!window.electronAPI?.isElectron?.();
  const platform = window.electronAPI?.getPlatform?.() ?? 'web';
  const [isMaximized, setIsMaximized] = useState(false);

  // Subscribe to maximize state changes from Electron main process
  useEffect(() => {
    if (!isElectron) return;

    // Get initial state
    window.electronAPI!.isMaximized().then(setIsMaximized);

    // Listen for changes
    window.electronAPI!.onMaximizedChange(setIsMaximized);
  }, [isElectron]);

  return {
    isElectron,
    platform,
    isMaximized,
    minimize: isElectron ? () => window.electronAPI!.minimize() : noop,
    maximize: isElectron ? () => window.electronAPI!.maximize() : noop,
    close: isElectron ? () => window.electronAPI!.close() : noop,
  };
}
