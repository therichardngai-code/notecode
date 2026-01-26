import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface FloatingPanelProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  position?: 'right' | 'center';
}

export function FloatingPanel({
  children,
  isOpen,
  onClose,
  title,
  className,
  position = 'right'
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
      <div
        ref={panelRef}
        className={cn(
          "bg-card border border-border rounded-lg shadow-lg flex flex-col max-h-[90vh]",
          position === 'right' ? "absolute right-4 top-4 bottom-4 w-96" : "w-full max-w-2xl",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
