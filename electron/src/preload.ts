/**
 * Electron Preload Script
 * Exposes safe IPC methods to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for type safety
export interface ElectronAPI {
  // Folder picker
  selectFolder: (options: {
    title?: string;
    defaultPath?: string;
  }) => Promise<{ cancelled: boolean; path: string | null }>;

  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  isElectron: () => boolean;

  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => void;

  // Backend URL (injected after startup)
  onBackendUrl: (callback: (url: string) => void) => void;
}

// Auto-updater API interface
export interface ElectronUpdaterAPI {
  check: () => Promise<unknown>;
  download: () => Promise<unknown>;
  install: () => void;
  onChecking: (cb: () => void) => void;
  onAvailable: (cb: (data: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => void;
  onNotAvailable: (cb: (data: { version: string }) => void) => void;
  onProgress: (cb: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => void;
  onDownloaded: (cb: (data: { version: string; releaseNotes?: string }) => void) => void;
  onError: (cb: (data: { message: string }) => void) => void;
}

// Expose protected methods to renderer process
const electronAPI: ElectronAPI = {
  // Native folder picker (uses Electron dialog instead of OS shell commands)
  selectFolder: (options) => ipcRenderer.invoke('dialog:selectFolder', options),

  // App information
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,
  isElectron: () => true,

  // Window controls (for custom title bar)
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, value) => callback(value));
  },

  // Listen for backend URL (sent after server starts)
  onBackendUrl: (callback) => {
    ipcRenderer.on('backend-url', (_event, url) => callback(url));
  },
};

// Auto-updater API (check, download, install updates via IPC)
const electronUpdater: ElectronUpdaterAPI = {
  check: () => ipcRenderer.invoke('updater:check'),
  download: () => ipcRenderer.invoke('updater:download'),
  install: () => ipcRenderer.invoke('updater:install'),
  onChecking: (cb) => { ipcRenderer.on('updater:checking', () => cb()); },
  onAvailable: (cb) => { ipcRenderer.on('updater:available', (_event, data) => cb(data)); },
  onNotAvailable: (cb) => { ipcRenderer.on('updater:not-available', (_event, data) => cb(data)); },
  onProgress: (cb) => { ipcRenderer.on('updater:progress', (_event, data) => cb(data)); },
  onDownloaded: (cb) => { ipcRenderer.on('updater:downloaded', (_event, data) => cb(data)); },
  onError: (cb) => { ipcRenderer.on('updater:error', (_event, data) => cb(data)); },
};

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronUpdater', electronUpdater);

// Log that preload script is loaded
console.log('[Preload] Electron API exposed to renderer');
