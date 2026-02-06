/**
 * Update Dialog
 * Modal dialog shown when a new version of NoteCode is available.
 * Supports both npm (shows CLI commands) and Electron (download + install) flows.
 */

import { useState, useCallback } from 'react';
import { Download, ArrowRight, Copy, Check, RefreshCw, AlertCircle, Rocket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { useUpdateManager } from '@/shared/hooks/use-version-check';

/** Copyable CLI command row */
function CommandRow({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <code className="text-sm font-mono text-foreground break-all">{command}</code>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
        title="Copy command"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

/** Download progress bar for Electron auto-updater */
function DownloadProgressBar({ percent, bytesPerSecond }: { percent: number; bytesPerSecond: number }) {
  const speed = bytesPerSecond > 1024 * 1024
    ? `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
    : `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Downloading update...</span>
        <span>{Math.round(percent)}% · {speed}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function UpdateDialog() {
  const {
    versionInfo,
    isLoading,
    isElectron,
    updateStatus,
    downloadProgress,
    errorMessage,
    downloadUpdate,
    installUpdate,
  } = useUpdateManager();

  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Only show when update is available and not dismissed
  const isOpen = !isLoading && !!versionInfo?.hasUpdate && !dismissed;

  /** Handle skip/dismiss */
  const handleSkip = useCallback(() => {
    setDismissed(true);
  }, []);

  // Nothing to render if no update or dismissed
  if (!versionInfo?.hasUpdate) return null;

  const { current, latest, releaseNotes, publishedAt } = versionInfo;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            A new version of NoteCode is available!
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1.5 mt-1">
              <span className="font-mono text-foreground/70">v{current}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono font-semibold text-primary">v{latest}</span>
            </span>
            {publishedAt && (
              <span className="block text-xs mt-1 text-muted-foreground">
                Released {new Date(publishedAt).toLocaleDateString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Release notes */}
        {releaseNotes && (
          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm text-foreground/80 whitespace-pre-wrap">
            {releaseNotes}
          </div>
        )}

        {/* Error state */}
        {updateStatus === 'error' && errorMessage && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Electron: download progress */}
        {isElectron && updateStatus === 'downloading' && downloadProgress && (
          <DownloadProgressBar percent={downloadProgress.percent} bytesPerSecond={downloadProgress.bytesPerSecond} />
        )}

        {/* npm: CLI update instructions */}
        {!isElectron && showInstructions && (
          <div className="space-y-2">
            <CommandRow label="Recommended" command="npx notecode@latest" />
            <CommandRow label="Global update" command="npm update -g notecode" />
            <CommandRow label="Specific version" command={`npm install -g notecode@${latest}`} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {/* Skip button — always visible unless download in progress */}
          {updateStatus !== 'downloading' && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              Skip
            </button>
          )}

          {/* Electron flow */}
          {isElectron && updateStatus === 'idle' && (
            <button
              onClick={downloadUpdate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Install & Relaunch
            </button>
          )}

          {isElectron && updateStatus === 'downloaded' && (
            <button
              onClick={installUpdate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Restart Now
            </button>
          )}

          {isElectron && updateStatus === 'error' && (
            <button
              onClick={downloadUpdate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}

          {/* npm flow */}
          {!isElectron && !showInstructions && (
            <button
              onClick={() => setShowInstructions(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View Update Instructions
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
