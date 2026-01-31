import { memo } from 'react';
import { ShieldAlert, Pencil, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';

interface PermissionSelectorDropdownProps {
  selectedMode: PermissionMode;
  isOpen: boolean;
  onSelect: (mode: PermissionMode) => void;
  onToggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * PermissionSelectorDropdown - Permission mode selector
 *
 * Controls how AI handles file modifications:
 * - default: Ask for permission (safest)
 * - acceptEdits: Auto-accept file edits
 * - bypassPermissions: Skip all permission checks (dangerous)
 *
 * Color coding: gray (default) → yellow (edits) → red (bypass)
 */
export const PermissionSelectorDropdown = memo(function PermissionSelectorDropdown({
  selectedMode,
  isOpen,
  onSelect,
  onToggle,
  containerRef,
}: PermissionSelectorDropdownProps) {
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          selectedMode === 'default' && "text-muted-foreground hover:text-foreground hover:bg-muted",
          selectedMode === 'acceptEdits' && "text-yellow-500 bg-yellow-500/10",
          selectedMode === 'bypassPermissions' && "text-red-500 bg-red-500/10"
        )}
        title={`Permission: ${selectedMode}`}
      >
        {selectedMode === 'default' && <ShieldAlert className="w-4 h-4" />}
        {selectedMode === 'acceptEdits' && <Pencil className="w-4 h-4" />}
        {selectedMode === 'bypassPermissions' && <Zap className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 w-44 glass border border-border rounded-lg shadow-lg py-1 z-20">
          <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            Permission Mode
          </div>
          <button
            onClick={() => onSelect('default')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors",
              selectedMode === 'default' && "text-primary font-medium"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Default (Ask)
          </button>
          <button
            onClick={() => onSelect('acceptEdits')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors",
              selectedMode === 'acceptEdits' && "text-yellow-500 font-medium"
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            Accept Edits
          </button>
          <button
            onClick={() => onSelect('bypassPermissions')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors",
              selectedMode === 'bypassPermissions' && "text-red-500 font-medium"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Bypass All
          </button>
        </div>
      )}
    </div>
  );
});
