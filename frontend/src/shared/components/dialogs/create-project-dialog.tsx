/**
 * Create Project Dialog
 * Dialog for creating a new project when opening a folder that doesn't exist in DB
 */

import { useState, useEffect } from 'react';
import { FolderOpen, X, Loader2, Star } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface CreateProjectDialogProps {
  isOpen: boolean;
  folderPath: string;
  suggestedName: string;
  onConfirm: (name: string, setAsActive: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreateProjectDialog({
  isOpen,
  folderPath,
  suggestedName,
  onConfirm,
  onCancel,
  isLoading = false,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState(suggestedName);
  const [setAsActive, setSetAsActive] = useState(true); // Default to true

  // Reset state when dialog opens with new suggested name
  useEffect(() => {
    if (isOpen) {
      setProjectName(suggestedName);
    }
  }, [isOpen, suggestedName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onConfirm(projectName.trim(), setAsActive);
    }
  };

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
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">New Project</h2>
              <p className="text-xs text-muted-foreground">This folder is not registered as a project</p>
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
          {/* Folder Path Display */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Folder Path</label>
            <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground font-mono truncate" title={folderPath}>
                {folderPath}
              </p>
            </div>
          </div>

          {/* Project Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="text-sm font-medium text-foreground">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm bg-background border border-border',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
              )}
              autoFocus
              disabled={isLoading}
            />
          </div>

          {/* Set as Active Project Toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Star className={cn("w-4 h-4", setAsActive ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
              <span className="text-sm font-medium text-foreground">Set as Active Project</span>
            </div>
            <button
              type="button"
              onClick={() => setSetAsActive(!setAsActive)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                setAsActive ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                  setAsActive ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2 ml-1">
            New tasks will use this project by default
          </p>

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
              disabled={!projectName.trim() || isLoading}
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
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
