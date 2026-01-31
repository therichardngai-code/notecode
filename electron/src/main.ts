/**
 * Electron Main Process
 * Manages app lifecycle, window creation, and embedded backend server
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort: number = 0;

/**
 * Check if running in development mode
 */
function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

/**
 * Start embedded backend server
 */
async function startBackendServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const isDevMode = isDev();

    // In production, backend is bundled in resources
    // In development, run from backend directory
    // __dirname = electron/dist, so ../../backend = notecode/backend
    const backendPath = isDevMode
      ? path.join(__dirname, '../../backend')
      : path.join(process.resourcesPath, 'backend');

    // ALWAYS use compiled backend (dist/main.js)
    // Build backend first: npm run build --prefix backend
    const backendScript = path.join(backendPath, 'dist/main.js');

    console.log('[Electron] Starting backend server...');
    console.log('[Electron] Backend path:', backendPath);
    console.log('[Electron] Backend script:', backendScript);
    console.log('[Electron] Mode:', isDevMode ? 'development' : 'production');

    // Start backend process with Node.js (not tsx)
    // Use process.execPath to ensure we find Node.js on Windows
    // This requires backend to be built first
    backendProcess = spawn(process.execPath, [backendScript], {
      cwd: backendPath,
      env: {
        ...process.env,
        NODE_ENV: isDevMode ? 'development' : 'production',
        PORT: '0', // Random available port
        IS_ELECTRON: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture backend output to detect port
    let portDetected = false;
    backendProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log('[Backend]', output.trim());

      // Detect port from backend output
      // Expected format: "Server listening on http://localhost:3001"
      const portMatch = output.match(/listening on.*:(\d+)/i);
      if (portMatch && !portDetected) {
        backendPort = parseInt(portMatch[1], 10);
        portDetected = true;
        console.log('[Electron] Backend port detected:', backendPort);
        resolve(backendPort);
      }
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[Backend Error]', data.toString().trim());
    });

    backendProcess.on('error', (error) => {
      console.error('[Electron] Failed to start backend:', error);

      // Check if error is due to missing compiled backend
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const helpMessage = isDevMode
          ? 'Build backend first: npm run build --prefix backend'
          : 'Backend files not found in packaged app';
        console.error('[Electron] ' + helpMessage);
        reject(new Error(`Backend startup failed: ${helpMessage}`));
      } else {
        reject(error);
      }
    });

    backendProcess.on('exit', (code) => {
      console.log('[Electron] Backend process exited with code:', code);
      if (!portDetected) {
        reject(new Error(`Backend exited before port was detected (code: ${code})`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!portDetected) {
        reject(new Error('Backend startup timeout - port not detected'));
      }
    }, 30000);
  });
}

/**
 * Create main application window
 */
async function createWindow(): Promise<void> {
  try {
    // Start backend first
    const port = await startBackendServer();
    console.log('[Electron] Backend running on port:', port);

    // Create browser window
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      titleBarStyle: 'hiddenInset', // macOS-style title bar
      frame: process.platform !== 'darwin',
      show: true, // Show immediately so window is always visible
      center: true, // Center on screen
      x: undefined, // Don't set position - use default
      y: undefined,
    });

    // Load frontend
    const frontendUrl = isDev()
      ? 'http://localhost:5173' // Vite dev server
      : `file://${path.join(__dirname, '../../frontend/dist/index.html')}`;

    console.log('[Electron] Loading frontend from:', frontendUrl);
    await mainWindow.loadURL(frontendUrl);

    // Inject backend URL after page loads
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('backend-url', `http://localhost:${port}`);
      console.log('[Electron] Backend URL sent to renderer:', `http://localhost:${port}`);
    });

    // Open DevTools in development
    if (isDev()) {
      mainWindow.webContents.openDevTools();
    }

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

  } catch (error) {
    console.error('[Electron] Failed to create window:', error);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start NoteCode:\n${error instanceof Error ? error.message : 'Unknown error'}`
    );
    app.quit();
  }
}

/**
 * App lifecycle handlers
 */

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Quit backend process
  if (backendProcess) {
    console.log('[Electron] Killing backend process...');
    backendProcess.kill('SIGTERM');
  }

  // Quit app (except on macOS)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Ensure backend is terminated
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
});

/**
 * IPC Handlers
 */

// Native folder dialog (better UX than web-based)
ipcMain.handle('dialog:selectFolder', async (_event, options: {
  title?: string;
  defaultPath?: string;
}) => {
  const result = await dialog.showOpenDialog({
    title: options.title || 'Select Folder',
    defaultPath: options.defaultPath,
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { cancelled: true, path: null };
  }

  return {
    cancelled: false,
    path: result.filePaths[0],
  };
});

// Get app version
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Window controls
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

/**
 * Error handlers
 */

process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
  dialog.showErrorBox('Error', `Uncaught exception: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron] Unhandled rejection:', reason);
});
