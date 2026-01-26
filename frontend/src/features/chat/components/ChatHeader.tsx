import { useState } from 'react';
import { Sparkles, Globe, Paperclip } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface ChatHeaderProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  onAttachmentClick?: () => void;
  sessionInfo?: {
    title?: string;
    messageCount?: number;
  };
}

const AI_MODELS = [
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gemini-2-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

export function ChatHeader({
  selectedModel = 'claude-3-5-sonnet',
  onModelChange,
  webSearchEnabled = false,
  onWebSearchToggle,
  onAttachmentClick,
  sessionInfo,
}: ChatHeaderProps) {
  const [isWebSearchOn, setIsWebSearchOn] = useState(webSearchEnabled);

  const handleWebSearchToggle = () => {
    const newState = !isWebSearchOn;
    setIsWebSearchOn(newState);
    onWebSearchToggle?.(newState);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {sessionInfo?.title || 'New Chat'}
          </span>
        </div>

        {sessionInfo?.messageCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {sessionInfo.messageCount} messages
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-xs">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={handleWebSearchToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isWebSearchOn
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          title="Toggle web search"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Web Search</span>
        </button>

        <button
          onClick={onAttachmentClick}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Attach files"
        >
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
