/**
 * Electron Auto-Updater Module
 * Checks GitHub Releases for updates, downloads in background, prompts user to install.
 * Only runs in production (packaged app), not in development.
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

/** Initialize auto-updater with IPC communication to renderer */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Config — don't auto-download, let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  // ── Events → Renderer via IPC ────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updater:checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    mainWindow.webContents.send('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    mainWindow.webContents.send('updater:not-available', {
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow.webContents.send('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    mainWindow.webContents.send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('error', (error: Error) => {
    console.error('[AutoUpdater] Error:', error.message);
    mainWindow.webContents.send('updater:error', {
      message: error.message,
    });
  });

  // ── IPC handlers from Renderer ───────────────────────────────

  ipcMain.handle('updater:check', async () => {
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    // isSilent=false (show installer), isForceRunAfter=true (relaunch after install)
    autoUpdater.quitAndInstall(false, true);
  });

  // ── Auto-check schedule ──────────────────────────────────────

  // Check 10s after startup (don't block app launch)
  setTimeout(() => {
    console.log('[AutoUpdater] Initial update check...');
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Initial check failed:', err.message);
    });
  }, 10_000);

  // Re-check every 4 hours while app is running
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);

  console.log('[AutoUpdater] Initialized — checking GitHub Releases for updates');
}
