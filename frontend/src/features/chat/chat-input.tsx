import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Paperclip, AtSign, Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  onAttachmentClick?: () => void;
  showMentionSuggestions?: boolean;
}

interface MentionSuggestion {
  id: string;
  type: 'file' | 'agent';
  label: string;
  description?: string;
}

const MOCK_SUGGESTIONS: MentionSuggestion[] = [
  { id: 'file-1', type: 'file', label: 'ChatContainer.tsx', description: 'src/features/chat' },
  { id: 'file-2', type: 'file', label: 'MessageItem.tsx', description: 'src/features/chat' },
  { id: 'agent-1', type: 'agent', label: 'planner', description: 'Planning agent' },
  { id: 'agent-2', type: 'agent', label: 'researcher', description: 'Research agent' },
];

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  loading = false,
  onAttachmentClick,
  showMentionSuggestions = false,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!value.trim() || disabled || loading) return;
    onSend(value, attachments);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }

    if (e.key === '@' && showMentionSuggestions) {
      setShowMentions(true);
    }

    if (showMentions && e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;

    // Detect @ mention
    if (showMentionSuggestions) {
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setShowMentions(true);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMentionSelect = (suggestion: MentionSuggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    const newValue =
      textBeforeCursor.slice(0, lastAtIndex) +
      `@${suggestion.label} ` +
      textAfterCursor;

    setValue(newValue);
    setShowMentions(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const filteredSuggestions = MOCK_SUGGESTIONS.filter((s) =>
    s.label.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="relative border-t border-border bg-background p-4">
      {/* Mention Suggestions Dropdown */}
      {showMentions && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleMentionSelect(suggestion)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
            >
              <AtSign className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{suggestion.label}</div>
                {suggestion.description && (
                  <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-xs"
            >
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => handleRemoveAttachment(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: '200px' }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => onAttachmentClick?.() || fileInputRef.current?.click()}
          disabled={disabled || loading}
          className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach files"
        >
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
          onClick={handleSubmit}
          disabled={disabled || loading || !value.trim()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
        {showMentionSuggestions && <> • Type @ to mention files or agents</>}
      </div>
    </div>
  );
}
