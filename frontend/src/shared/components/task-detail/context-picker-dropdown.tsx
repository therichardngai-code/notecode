import { memo } from 'react';
import { FileCode } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ContextPickerDropdownProps {
  isOpen: boolean;
  filteredFiles: string[];
  selectedIndex: number;
  onSelect: (file: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * ContextPickerDropdown - @-mention file picker dropdown
 *
 * Displays a list of filtered files for context attachment.
 * Supports keyboard navigation with arrow keys.
 * Shows max 8 items with "+N more" indicator.
 */
export const ContextPickerDropdown = memo(function ContextPickerDropdown({
  isOpen,
  filteredFiles,
  selectedIndex,
  onSelect,
  containerRef,
}: ContextPickerDropdownProps) {
  if (!isOpen || filteredFiles.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-1 w-72 max-h-48 overflow-y-auto glass border border-border rounded-lg shadow-lg py-1 z-30"
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
        Files
      </div>
      {filteredFiles.slice(0, 8).map((file, idx) => (
        <button
          key={file}
          onClick={() => onSelect(file)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
            idx === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{file}</span>
        </button>
      ))}
      {filteredFiles.length > 8 && (
        <div className="px-3 py-1 text-xs text-muted-foreground">
          +{filteredFiles.length - 8} more
        </div>
      )}
    </div>
  );
});
