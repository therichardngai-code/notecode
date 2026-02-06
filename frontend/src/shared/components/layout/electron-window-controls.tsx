/**
 * Window control buttons (minimize, maximize/restore, close) for Electron frameless window.
 * Follows Windows-style traffic light layout. Only renders in Electron mode.
 */

import { Minus, Square, Copy, X } from 'lucide-react';
import { useElectron } from '@/shared/hooks/use-electron';

export function ElectronWindowControls() {
  const { isElectron, isMaximized, minimize, maximize, close } = useElectron();

  if (!isElectron) return null;

  return (
    <div className="flex electron-no-drag">
      {/* Minimize */}
      <button
        onClick={minimize}
        className="w-12 h-8 flex items-center justify-center text-foreground/70 hover:bg-muted/60 transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Maximize / Restore */}
      <button
        onClick={maximize}
        className="w-12 h-8 flex items-center justify-center text-foreground/70 hover:bg-muted/60 transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized
          ? <Copy className="w-3.5 h-3.5 rotate-180" />
          : <Square className="w-3.5 h-3.5" />
        }
      </button>

      {/* Close */}
      <button
        onClick={close}
        className="w-12 h-8 flex items-center justify-center text-foreground/70 hover:bg-red-500 hover:text-white transition-colors"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
