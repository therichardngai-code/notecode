/**
 * Folder Picker Service
 * Cross-platform native OS folder selection dialogs
 * Supports: Electron, Windows, macOS, Linux (GTK/KDE/Qt)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

// Electron dialog interface (avoid importing electron types directly)
interface ElectronDialog {
  showOpenDialog(options: {
    title?: string;
    defaultPath?: string;
    properties?: string[];
    buttonLabel?: string;
  }): Promise<{ canceled: boolean; filePaths: string[] }>;
}

// Cached Electron dialog module
let electronDialog: ElectronDialog | null = null;

/**
 * Check if running in Electron main process
 */
function isElectron(): boolean {
  return !!(
    typeof process !== 'undefined' &&
    process.versions &&
    (process.versions as Record<string, string>).electron
  );
}

/**
 * Initialize Electron dialog if available
 */
async function getElectronDialog(): Promise<ElectronDialog | null> {
  if (electronDialog) return electronDialog;

  if (!isElectron()) return null;

  try {
    // Dynamic require to avoid bundling electron in non-electron builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron');
    electronDialog = electron.dialog as ElectronDialog;
    return electronDialog;
  } catch {
    return null;
  }
}

export interface FolderPickerOptions {
  title?: string;
  initialPath?: string;
}

export interface FolderPickerResult {
  path: string | null;
  name: string | null;
  cancelled: boolean;
  error?: string;
  platform?: string;
}

/**
 * Gets platform info for diagnostics
 */
export function getPlatformInfo(): { platform: string; supported: boolean; method: string; isElectron: boolean } {
  const platform = process.platform;
  const electron = isElectron();

  if (electron) {
    return { platform: 'Electron', supported: true, method: 'electron.dialog.showOpenDialog', isElectron: true };
  }

  switch (platform) {
    case 'win32':
      return { platform: 'Windows', supported: true, method: 'PowerShell FolderBrowserDialog', isElectron: false };
    case 'darwin':
      return { platform: 'macOS', supported: true, method: 'AppleScript choose folder', isElectron: false };
    case 'linux':
      return { platform: 'Linux', supported: true, method: 'zenity/kdialog/yad', isElectron: false };
    default:
      return { platform, supported: false, method: 'none', isElectron: false };
  }
}

/**
 * Opens native OS folder picker dialog and returns selected path
 * @param options - Dialog title and initial path
 */
export async function selectFolder(options: FolderPickerOptions = {}): Promise<FolderPickerResult> {
  const { title = 'Select Folder', initialPath } = options;
  const platform = process.platform;

  // Validate initialPath if provided
  const validInitialPath = initialPath && fs.existsSync(initialPath) ? initialPath : undefined;

  try {
    let selectedPath: string | null = null;

    // Try Electron dialog first if available
    const dialog = await getElectronDialog();
    if (dialog) {
      selectedPath = await selectFolderElectron(dialog, title, validInitialPath);
    } else {
      // Fall back to OS-specific methods
      switch (platform) {
        case 'win32':
          selectedPath = await selectFolderWindows(title, validInitialPath);
          break;
        case 'darwin':
          selectedPath = await selectFolderMacOS(title, validInitialPath);
          break;
        case 'linux':
        case 'freebsd':
        case 'openbsd':
          selectedPath = await selectFolderLinux(title, validInitialPath);
          break;
        default:
          return {
            path: null,
            name: null,
            cancelled: true,
            error: `Unsupported platform: ${platform}`,
            platform
          };
      }
    }

    if (!selectedPath) {
      return { path: null, name: null, cancelled: true, platform };
    }

    // Normalize path (use forward slashes for consistency)
    const normalizedPath = selectedPath.replace(/\\/g, '/');

    // Validate selected path exists
    if (!fs.existsSync(selectedPath)) {
      return {
        path: null,
        name: null,
        cancelled: true,
        error: 'Selected path does not exist',
        platform
      };
    }

    const folderName = path.basename(selectedPath);
    return { path: normalizedPath, name: folderName, cancelled: false, platform };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { path: null, name: null, cancelled: true, error: errorMsg, platform };
  }
}

/**
 * Electron: Use native dialog.showOpenDialog
 * Best option when running in Electron - native, reliable, cross-platform
 */
async function selectFolderElectron(
  dialog: ElectronDialog,
  title: string,
  initialPath?: string
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title,
    defaultPath: initialPath,
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Windows: FolderBrowserDialog via temp PowerShell script
 * Uses temp file to avoid command-line escaping issues
 */
async function selectFolderWindows(title: string, initialPath?: string): Promise<string | null> {
  const escapedTitle = title.replace(/'/g, "''");
  const escapedPath = initialPath ? initialPath.replace(/'/g, "''").replace(/\//g, '\\') : '';

  // PowerShell script content
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '${escapedTitle}'
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer
${initialPath ? `$dialog.SelectedPath = '${escapedPath}'` : ''}

# Create a hidden form to own the dialog (ensures proper window focus)
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = 'Minimized'
$form.ShowInTaskbar = $false

$result = $dialog.ShowDialog($form)
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`.trim();

  // Write script to temp file to avoid escaping issues
  const tempFile = path.join(os.tmpdir(), `folder-picker-${Date.now()}.ps1`);
  fs.writeFileSync(tempFile, psScript, 'utf8');

  try {
    // Execute with -STA flag for Single-Threaded Apartment (required for Windows Forms)
    const { stdout } = await execAsync(
      `powershell -NoProfile -STA -ExecutionPolicy Bypass -File "${tempFile}"`,
      { timeout: 120000 } // 2 min timeout for user interaction
    );

    return stdout.trim() || null;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * macOS: AppleScript choose folder with optional default location
 * Uses temp script file for reliable execution
 */
async function selectFolderMacOS(title: string, initialPath?: string): Promise<string | null> {
  const escapedTitle = title.replace(/"/g, '\\"').replace(/'/g, "'\\''");

  // Build AppleScript
  let script: string;
  if (initialPath) {
    const escapedPath = initialPath.replace(/"/g, '\\"');
    script = `
set selectedFolder to choose folder with prompt "${escapedTitle}" default location POSIX file "${escapedPath}"
return POSIX path of selectedFolder
`.trim();
  } else {
    script = `
set selectedFolder to choose folder with prompt "${escapedTitle}"
return POSIX path of selectedFolder
`.trim();
  }

  // Write script to temp file for reliable execution
  const tempFile = path.join(os.tmpdir(), `folder-picker-${Date.now()}.scpt`);
  fs.writeFileSync(tempFile, script, 'utf8');

  try {
    const { stdout } = await execAsync(
      `osascript "${tempFile}"`,
      { timeout: 120000 }
    );

    const result = stdout.trim();
    // Remove trailing slash if present
    return result.endsWith('/') ? result.slice(0, -1) : result || null;
  } catch (error) {
    // User cancelled (error code -128) or other error
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('-128') || errorMsg.includes('User canceled')) {
      return null; // User cancelled
    }
    throw error;
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Linux: Try multiple dialog tools in order of preference
 * zenity (GTK) -> kdialog (KDE) -> yad (GTK fork) -> xdg-desktop-portal
 */
async function selectFolderLinux(title: string, initialPath?: string): Promise<string | null> {
  const escapedTitle = title.replace(/"/g, '\\"');
  const initialDir = initialPath || os.homedir();

  // Try zenity (most common, GTK-based)
  try {
    const { stdout } = await execAsync(
      `zenity --file-selection --directory --title="${escapedTitle}" --filename="${initialDir}/"`,
      { timeout: 120000 }
    );
    return stdout.trim() || null;
  } catch {
    // zenity not available or user cancelled
  }

  // Try kdialog (KDE)
  try {
    const { stdout } = await execAsync(
      `kdialog --getexistingdirectory "${initialDir}" --title "${escapedTitle}"`,
      { timeout: 120000 }
    );
    return stdout.trim() || null;
  } catch {
    // kdialog not available or user cancelled
  }

  // Try yad (Yet Another Dialog - GTK fork with more features)
  try {
    const { stdout } = await execAsync(
      `yad --file --directory --title="${escapedTitle}" --filename="${initialDir}/"`,
      { timeout: 120000 }
    );
    return stdout.trim() || null;
  } catch {
    // yad not available or user cancelled
  }

  // Try xdg-desktop-portal via gdbus (works with Flatpak/Snap apps)
  try {
    const { stdout } = await execAsync(
      `gdbus call --session --dest org.freedesktop.portal.Desktop --object-path /org/freedesktop/portal/desktop --method org.freedesktop.portal.FileChooser.OpenFile "" "${escapedTitle}" "{'directory': <true>}"`,
      { timeout: 120000 }
    );
    // Parse DBus response - this is complex, simplified handling
    const match = stdout.match(/file:\/\/([^'"\s]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Portal not available
  }

  throw new Error('No folder picker available. Install one of: zenity, kdialog, yad');
}

/**
 * Validates if a path exists and is a directory
 */
export function validatePath(folderPath: string): {
  exists: boolean;
  isDirectory: boolean;
  name: string | null;
  absolutePath: string | null;
} {
  try {
    // Resolve to absolute path
    const absolutePath = path.resolve(folderPath);
    const stat = fs.statSync(absolutePath);
    return {
      exists: true,
      isDirectory: stat.isDirectory(),
      name: stat.isDirectory() ? path.basename(absolutePath) : null,
      absolutePath: stat.isDirectory() ? absolutePath.replace(/\\/g, '/') : null,
    };
  } catch {
    return { exists: false, isDirectory: false, name: null, absolutePath: null };
  }
}
