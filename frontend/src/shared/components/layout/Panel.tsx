import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PanelProps {
  children: ReactNode;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export function Panel({ children, title, onClose, className }: PanelProps) {
  return (
    <div className={cn("flex flex-col border border-border rounded-lg bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
