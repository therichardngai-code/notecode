/**
 * Create File/Folder Dialog
 * Reusable dialog for creating new files or folders
 */

import { useState, useEffect } from 'react';
import { FilePlus, FolderPlus, X, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface CreateFileDialogProps {
  isOpen: boolean;
  type: 'file' | 'folder';
  parentPath: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreateFileDialog({
  isOpen,
  type,
  parentPath,
  onConfirm,
  onCancel,
  isLoading = false,
}: CreateFileDialogProps) {
  const [name, setName] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  const Icon = type === 'file' ? FilePlus : FolderPlus;
  const title = type === 'file' ? 'New File' : 'New Folder';
  const placeholder = type === 'file' ? 'Enter file name (e.g., index.ts)' : 'Enter folder name';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-xl animate-float-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[250px]" title={parentPath}>
                in {parentPath || '/'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            disabled={isLoading}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="itemName" className="text-sm font-medium text-foreground">
              {type === 'file' ? 'File Name' : 'Folder Name'}
            </label>
            <input
              id="itemName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm bg-background border border-border',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
              )}
              autoFocus
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Icon className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
