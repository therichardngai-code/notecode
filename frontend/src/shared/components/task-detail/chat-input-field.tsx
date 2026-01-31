import { memo } from 'react';
import { ContextPickerDropdown } from './context-picker-dropdown';

interface ChatInputFieldProps {
  // Input state
  chatInput: string;
  isSessionLive: boolean;
  isWsConnected: boolean;
  isTyping: boolean;
  isWaitingForResponse: boolean;

  // Context picker state
  showContextPicker: boolean;
  filteredFiles: string[];
  contextPickerIndex: number;

  // Refs
  chatInputRef: React.RefObject<HTMLInputElement>;
  contextPickerRef: React.RefObject<HTMLDivElement>;

  // Callbacks
  onChatInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChatKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onContextPickerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onSelectContextFile: (file: string) => void;
}

/**
 * ChatInputField - Text input with @-mention context picker
 *
 * Handles user text input with integrated context file picker.
 * Context picker triggered by '@' character.
 * Supports paste, keyboard navigation, and disabled states.
 */
export const ChatInputField = memo(function ChatInputField({
  chatInput,
  isSessionLive,
  isWsConnected,
  isTyping,
  isWaitingForResponse,
  showContextPicker,
  filteredFiles,
  contextPickerIndex,
  chatInputRef,
  contextPickerRef,
  onChatInputChange,
  onChatKeyDown,
  onContextPickerKeyDown,
  onPaste,
  onSelectContextFile,
}: ChatInputFieldProps) {
  return (
    <div className="relative mb-2">
      <input
        ref={chatInputRef}
        type="text"
        value={chatInput}
        onChange={onChatInputChange}
        onKeyDown={(e) => {
          onContextPickerKeyDown(e);
          if (!showContextPicker) onChatKeyDown(e);
        }}
        onPaste={onPaste}
        placeholder={
          isSessionLive && isWsConnected
            ? "Type @ to add context..."
            : "Type @ to add files..."
        }
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        disabled={isTyping || isWaitingForResponse}
      />
      {/* @ Context Picker Dropdown */}
      <ContextPickerDropdown
        isOpen={showContextPicker}
        filteredFiles={filteredFiles}
        selectedIndex={contextPickerIndex}
        onSelect={onSelectContextFile}
        containerRef={contextPickerRef}
      />
    </div>
  );
});
