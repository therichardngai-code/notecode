/**
 * Git Init Confirmation Dialog
 * Shows when autoBranch is enabled but project is not a git repository
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { GitBranch, AlertTriangle } from 'lucide-react';

interface GitInitDialogProps {
  open: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GitInitDialog({
  open,
  projectName,
  onConfirm,
  onCancel,
  isLoading = false,
}: GitInitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Git Repository Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The project <strong className="text-foreground">"{projectName}"</strong> is not a git repository.
          </p>
          <p className="text-sm text-muted-foreground">
            Auto-branching requires git to be initialized. Would you like to
            initialize git now?
          </p>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
          >
            No, Skip Branching
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <GitBranch className="h-4 w-4" />
            {isLoading ? 'Initializing...' : 'Yes, Initialize Git'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
