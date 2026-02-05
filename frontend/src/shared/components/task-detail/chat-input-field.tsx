import { memo } from 'react';
import { ContextPickerDropdown } from './context-picker-dropdown';
import type { Task } from '@/adapters/api/tasks-api';

interface ChatInputFieldProps {
  // Input state
  chatInput: string;
  isSessionLive: boolean;
  isWsConnected: boolean;
  isTyping: boolean;
  isWaitingForResponse: boolean;

  // Task state (for Enter key action logic)
  task: Task;

  // Context picker state
  showContextPicker: boolean;
  filteredFiles: string[];
  contextPickerIndex: number;
  isSearchingFiles?: boolean;

  // Refs
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  contextPickerRef: React.RefObject<HTMLDivElement | null>;

  // Callbacks
  onChatInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContextPickerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onSelectContextFile: (file: string) => void;
  onSendMessage: (content: string) => void;
  onStartTask: () => void;
  onStartSessionWithMode: (mode: 'retry') => void;
  onContinueTask: () => void;
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
  task,
  showContextPicker,
  filteredFiles,
  contextPickerIndex,
  isSearchingFiles,
  chatInputRef,
  contextPickerRef,
  onChatInputChange,
  onContextPickerKeyDown,
  onPaste,
  onSelectContextFile,
  onSendMessage,
  onStartTask,
  onStartSessionWithMode,
  onContinueTask,
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
          // Handle Enter key - mirror button logic
          if (!showContextPicker && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (isSessionLive && isWsConnected) {
              // Session active - send message
              onSendMessage(chatInput);
            } else if (task.status === 'not-started') {
              // Start task
              onStartTask();
            } else if (task.status === 'in-progress' && !isSessionLive) {
              // Resume session
              onStartSessionWithMode('retry');
            } else {
              // Continue task
              onContinueTask();
            }
          }
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
        isSearching={isSearchingFiles}
        onSelect={onSelectContextFile}
        containerRef={contextPickerRef}
      />
    </div>
  );
});
