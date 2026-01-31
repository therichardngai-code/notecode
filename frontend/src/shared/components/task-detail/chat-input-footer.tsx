import { memo } from 'react';
import { AtSign, Paperclip, Globe } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { FileAttachmentList } from './file-attachment-list';
import { ChatInputField } from './chat-input-field';
import { ChatActionButtons } from './chat-action-buttons';
import { ModelSelectorDropdown } from './model-selector-dropdown';
import { PermissionSelectorDropdown } from './permission-selector-dropdown';
import { ContextWindowIndicator } from './context-window-indicator';
import type { Session } from '@/adapters/api/sessions-api';
import type { Task } from '@/adapters/api/tasks-api';

type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';
type ModelType = 'default' | 'haiku' | 'sonnet' | 'opus';

interface ChatInputFooterProps {
  // Session state
  latestSession: Session | undefined;
  isSessionLive: boolean;
  isWsConnected: boolean;

  // Task state
  task: Task;
  isStartingSession: boolean;
  isUpdating: boolean;

  // Input state
  chatInput: string;
  attachedFiles: string[];
  selectedModel: ModelType;
  webSearchEnabled: boolean;
  chatPermissionMode: PermissionMode;

  // Drag/drop state
  isDragOver: boolean;

  // Context picker state
  showContextPicker: boolean;
  filteredFiles: string[];
  contextPickerIndex: number;

  // Dropdown states
  showModelDropdown: boolean;
  showPermissionDropdown: boolean;

  // Refs
  chatInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  contextPickerRef: React.RefObject<HTMLDivElement>;
  modelDropdownRef: React.RefObject<HTMLDivElement>;
  permissionDropdownRef: React.RefObject<HTMLDivElement>;

  // Callbacks
  onChatInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChatKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onContextPickerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFile: (idx: number) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectContextFile: (file: string) => void;
  onAddContext: () => void;
  onSetSelectedModel: (model: ModelType) => void;
  onToggleWebSearch: () => void;
  onSetPermissionMode: (mode: PermissionMode) => void;
  onToggleModelDropdown: () => void;
  onTogglePermissionDropdown: () => void;

  // Actions
  onSendMessage: (input: string) => void;
  onSendCancel: () => void;
  onStartTask: () => void;
  onStartSessionWithMode: (mode: 'retry') => void;
  onCancelTask: () => void;
  onContinueTask: () => void;

  // Streaming state
  isWaitingForResponse: boolean;
  isTyping: boolean;
}

/**
 * ChatInputFooter - Main chat input container
 *
 * Orchestrates all input-related UI components:
 * - Drag/drop file handling
 * - Context picker integration
 * - File attachments display
 * - Model/permission/web search controls
 * - Conditional action buttons
 *
 * Modularized into focused sub-components for maintainability.
 */
export const ChatInputFooter = memo(function ChatInputFooter({
  latestSession,
  isSessionLive,
  isWsConnected,
  task,
  isStartingSession,
  isUpdating,
  chatInput,
  attachedFiles,
  selectedModel,
  webSearchEnabled,
  chatPermissionMode,
  isDragOver,
  showContextPicker,
  filteredFiles,
  contextPickerIndex,
  showModelDropdown,
  showPermissionDropdown,
  chatInputRef,
  fileInputRef,
  contextPickerRef,
  modelDropdownRef,
  permissionDropdownRef,
  onChatInputChange,
  onChatKeyDown,
  onContextPickerKeyDown,
  onPaste,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onFileSelect,
  onSelectContextFile,
  onAddContext,
  onSetSelectedModel,
  onToggleWebSearch,
  onSetPermissionMode,
  onToggleModelDropdown,
  onTogglePermissionDropdown,
  onSendMessage,
  onSendCancel,
  onStartTask,
  onStartSessionWithMode,
  onCancelTask,
  onContinueTask,
  isWaitingForResponse,
  isTyping,
}: ChatInputFooterProps) {
  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "rounded-2xl border p-3 transition-colors relative",
            isDragOver
              ? "border-primary border-dashed bg-primary/10"
              : isWsConnected && isSessionLive
                ? "border-green-500/30 bg-green-500/5 focus-within:border-green-500/50"
                : "border-border bg-muted/30 focus-within:border-primary/50"
          )}
        >
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Paperclip className="w-5 h-5" />
                Drop files here
              </div>
            </div>
          )}

          {/* Add context button + Context window indicator */}
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={onAddContext}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
            >
              <AtSign className="w-3.5 h-3.5" />
              Add context
            </button>
            <ContextWindowIndicator contextWindow={latestSession?.contextWindow} />
          </div>

          {/* Attached Files Display */}
          <FileAttachmentList
            attachedFiles={attachedFiles}
            onRemoveFile={onRemoveFile}
          />

          {/* Input with @ context picker */}
          <ChatInputField
            chatInput={chatInput}
            isSessionLive={isSessionLive}
            isWsConnected={isWsConnected}
            isTyping={isTyping}
            isWaitingForResponse={isWaitingForResponse}
            showContextPicker={showContextPicker}
            filteredFiles={filteredFiles}
            contextPickerIndex={contextPickerIndex}
            chatInputRef={chatInputRef}
            contextPickerRef={contextPickerRef}
            onChatInputChange={onChatInputChange}
            onChatKeyDown={onChatKeyDown}
            onContextPickerKeyDown={onContextPickerKeyDown}
            onPaste={onPaste}
            onSelectContextFile={onSelectContextFile}
          />

          {/* Bottom row: tools + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {/* File Attachment */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelect}
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Model Selector */}
              <ModelSelectorDropdown
                selectedModel={selectedModel}
                isOpen={showModelDropdown}
                onSelect={onSetSelectedModel}
                onToggle={onToggleModelDropdown}
                containerRef={modelDropdownRef}
              />

              {/* Web Search Toggle */}
              <button
                onClick={onToggleWebSearch}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  webSearchEnabled
                    ? "text-blue-500 bg-blue-500/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={webSearchEnabled ? "Web search enabled" : "Web search disabled"}
              >
                <Globe className={cn("w-3.5 h-3.5", webSearchEnabled && "text-blue-500")} />
                Web
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Permission Mode Selector */}
              <PermissionSelectorDropdown
                selectedMode={chatPermissionMode}
                isOpen={showPermissionDropdown}
                onSelect={onSetPermissionMode}
                onToggle={onTogglePermissionDropdown}
                containerRef={permissionDropdownRef}
              />

              {/* Action Buttons - Conditional */}
              <ChatActionButtons
                task={task}
                isSessionLive={isSessionLive}
                isWsConnected={isWsConnected}
                isStartingSession={isStartingSession}
                isUpdating={isUpdating}
                isWaitingForResponse={isWaitingForResponse}
                chatInput={chatInput}
                onSendMessage={onSendMessage}
                onSendCancel={onSendCancel}
                onStartTask={onStartTask}
                onStartSessionWithMode={onStartSessionWithMode}
                onCancelTask={onCancelTask}
                onContinueTask={onContinueTask}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
