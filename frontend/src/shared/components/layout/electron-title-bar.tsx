/**
 * Custom title bar for Electron frameless window.
 * Provides drag region + app branding + window controls.
 * Only renders when running in Electron — returns null in web browser.
 */

import { useElectron } from '@/shared/hooks/use-electron';
import { ElectronWindowControls } from './electron-window-controls';

export function ElectronTitleBar() {
  const { isElectron } = useElectron();

  if (!isElectron) return null;

  return (
    <div className="h-8 flex items-center justify-between glass-subtle border-b border-border/30 electron-drag-region shrink-0">
      {/* Left: App icon + name */}
      <div className="flex items-center gap-2 px-3 electron-no-drag">
        <img src="/logo.svg" alt="NoteCode" className="w-4 h-4" />
        <span className="text-xs text-muted-foreground font-medium select-none">NoteCode</span>
      </div>

      {/* Right: Window controls */}
      <ElectronWindowControls />
    </div>
  );
}
