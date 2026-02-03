/**
 * Delete Confirmation Dialog
 * Reusable styled dialog for delete confirmations
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  title = 'Delete Item',
  itemName,
  description = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {itemName && (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">"{itemName}"</strong>?
            </p>
          )}
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
