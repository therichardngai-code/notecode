import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface SidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export function Sidebar({ children, isOpen, onClose, title, className }: SidebarProps) {
  return (
    <div
      className={cn(
        "border-r border-border flex flex-col bg-background shrink-0",
        "transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64 opacity-100" : "w-0 opacity-0",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h2 className="text-sm font-semibold">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
