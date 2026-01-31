/**
 * Context Warning Dialog Component
 * Modal that appears when context window reaches critical threshold
 * Memoized to prevent re-renders on parent state changes
 */

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { ContextWindowUsage } from '@/domain/entities/session';
import { PROVIDER_CONTEXT_CONFIG } from '@/shared/constants/provider-config';

interface Props {
  open: boolean;
  contextWindow?: ContextWindowUsage | null;
  onClose: () => void;
  onRenew?: () => void;
}

export const ContextWarningDialog = memo(function ContextWarningDialog({ open, contextWindow, onClose, onRenew }: Props) {
  if (!contextWindow) return null;

  const { contextPercent, provider } = contextWindow;
  const config = PROVIDER_CONTEXT_CONFIG[provider];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            Context Window Almost Full
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-foreground">
              Your conversation context is at <strong className="text-yellow-600">{contextPercent}%</strong> capacity.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-3">To continue efficiently, you can:</p>

            <div className="space-y-3">
              {/* Option 1: Renew */}
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Use Renew to start fresh</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Creates new session with clean context (recommended)
                  </p>
                </div>
              </div>

              {/* Option 2: Autocompact */}
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 rounded-md bg-muted">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Let {config.displayName} autocompact</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {config.displayName} will automatically compact context soon
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="px-3 py-2 rounded-md bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">💡 Tip:</span> Use Renew when starting a new task or switching topics to maintain optimal performance.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            Continue Anyway
          </button>
          {onRenew && (
            <button
              onClick={onRenew}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Renew Session
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
