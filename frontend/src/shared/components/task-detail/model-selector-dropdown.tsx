import { memo } from 'react';
import { Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type ModelType = 'default' | 'haiku' | 'sonnet' | 'opus';

interface ModelSelectorDropdownProps {
  selectedModel: ModelType;
  isOpen: boolean;
  onSelect: (model: ModelType) => void;
  onToggle: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * ModelSelectorDropdown - AI model selector
 *
 * Allows selection between 4 AI models:
 * - default: Standard model
 * - haiku: Fast, lightweight
 * - sonnet: Balanced
 * - opus: Most capable
 */
export const ModelSelectorDropdown = memo(function ModelSelectorDropdown({
  selectedModel,
  isOpen,
  onSelect,
  onToggle,
  containerRef,
}: ModelSelectorDropdownProps) {
  const models: ModelType[] = ['default', 'haiku', 'sonnet', 'opus'];

  const formatModelName = (model: ModelType): string => {
    return model === 'default' ? 'Default' : model.charAt(0).toUpperCase() + model.slice(1);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
          selectedModel !== 'default'
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Zap className="w-3.5 h-3.5" />
        {formatModelName(selectedModel)}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-32 glass border border-border rounded-lg shadow-lg py-1 z-20">
          {models.map((model) => (
            <button
              key={model}
              onClick={() => onSelect(model)}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors",
                selectedModel === model
                  ? "text-primary font-medium"
                  : "text-popover-foreground"
              )}
            >
              {formatModelName(model)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
