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

  // Backend URL (injected after startup)
  onBackendUrl: (callback: (url: string) => void) => void;
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

  // Listen for backend URL (sent after server starts)
  onBackendUrl: (callback) => {
    ipcRenderer.on('backend-url', (_event, url) => callback(url));
  },
};

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload script is loaded
console.log('[Preload] Electron API exposed to renderer');
