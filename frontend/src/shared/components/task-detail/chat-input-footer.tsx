import { memo, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { AtSign, Paperclip, Globe } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useChatInputState, useContextPicker, useChatHandlers, useDragDrop } from '@/shared/hooks';
import { FileAttachmentList } from './file-attachment-list';
import { ChatInputField } from './chat-input-field';
import { ChatActionButtons } from './chat-action-buttons';
import { ModelSelectorDropdown } from './model-selector-dropdown';
import { PermissionSelectorDropdown } from './permission-selector-dropdown';
import { ContextWindowIndicator } from './context-window-indicator';
import type { Session } from '@/adapters/api/sessions-api';
import type { Task } from '@/adapters/api/tasks-api';
import type { ChatMessage } from '@/shared/types';

type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';
type ModelType = 'default' | 'haiku' | 'sonnet' | 'opus';

// Exposed methods interface (minimal API - rerender-defer-reads pattern)
export interface ChatInputFooterHandle {
  getChatInput: () => string;
  clearChatInput: () => void;
}

interface ChatInputFooterProps {
  // Session state
  latestSession: Session | undefined;
  isSessionLive: boolean;
  isWsConnected: boolean;

  // Task state
  task: Task;
  isStartingSession: boolean;
  isUpdating: boolean;

  // Real-time state (from parent - READONLY)
  realtimeMessages: ChatMessage[];
  setRealtimeMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentAssistantMessage: string;
  setCurrentAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  isWaitingForResponse: boolean;
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;

  // WebSocket actions
  sendUserInput: (content: string, options?: any) => void;
  sendCancel: () => void;

  // Task actions
  onStartTask: () => void;
  onStartSessionWithMode: (mode: 'retry') => void;
  onCancelTask: () => void;
  onContinueTask: () => void;
}

/**
 * ChatInputFooter - Fully encapsulated chat input component
 *
 * Owns ALL chat input state internally (no parent subscription).
 * Exposes minimal imperative API for parent via ref.
 *
 * Performance: Parent re-renders DON'T trigger this component.
 * Follows: rerender-defer-reads, rerender-functional-setstate
 * Best practices from: react-best-practices, frontend-development skills
 */
export const ChatInputFooter = memo(forwardRef<ChatInputFooterHandle, ChatInputFooterProps>(
  function ChatInputFooter({
    latestSession,
    isSessionLive,
    isWsConnected,
    task,
    isStartingSession,
    isUpdating,
    realtimeMessages,
    setRealtimeMessages,
    currentAssistantMessage,
    setCurrentAssistantMessage,
    isWaitingForResponse,
    setIsWaitingForResponse,
    isTyping,
    setIsTyping,
    sendUserInput,
    sendCancel,
    onStartTask,
    onStartSessionWithMode,
    onCancelTask,
    onContinueTask,
  }, ref) {

    // LOCAL STATE - No parent subscription! (rerender-defer-reads)
    const chatState = useChatInputState();
    const {
      chatInput,
      setChatInput,
      attachedFiles,
      setAttachedFiles,
      selectedModel,
      setSelectedModel,
      webSearchEnabled,
      chatPermissionMode,
      setChatPermissionMode,
      // isTyping - comes from parent (displayed in AISessionTab)
      // setIsTyping - comes from parent (passed to useChatHandlers)
      showModelDropdown,
      showPermissionDropdown,
      setShowModelDropdown,
      setShowPermissionDropdown,
      getChatInput,
      clearChatInput,
      toggleWebSearch,
      toggleModelDropdown,
      togglePermissionDropdown,
    } = chatState;

    // Expose imperative API to parent (minimal interface)
    useImperativeHandle(ref, () => ({
      getChatInput,
      clearChatInput,
    }), [getChatInput, clearChatInput]);

    // LOCAL REFS - Component-owned
    const chatInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);
    const permissionDropdownRef = useRef<HTMLDivElement>(null);
    const contextPickerRef = useRef<HTMLDivElement>(null);

    // LOCAL HOOKS - Move inside component (performance optimization)
    const contextPicker = useContextPicker({
      chatInput,
      setChatInput,
      attachedFiles,
      setAttachedFiles,
      chatInputRef,
    });

    const chatHandlers = useChatHandlers({
      isWsConnected,
      isSessionLive,
      chatInput,
      attachedFiles,
      selectedModel,
      chatPermissionMode,
      webSearchEnabled,
      isWaitingForResponse,
      isTyping, // From parent (displayed in AISessionTab)
      showContextPicker: contextPicker.showContextPicker,
      sendUserInput,
      setRealtimeMessages,
      setChatInput,
      setAttachedFiles,
      setIsWaitingForResponse,
      setCurrentAssistantMessage,
      setIsTyping, // Pass from parent to update AISessionTab state
    });

    // Drag/drop handlers (local hook)
    const dragDrop = useDragDrop({ setAttachedFiles });

    // File handlers (useCallback for stability)
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const filePaths = Array.from(files).map(f => f.name);
        setAttachedFiles(prev => [...prev, ...filePaths]); // Functional setState
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, [setAttachedFiles]);

    const removeAttachedFile = useCallback((index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index)); // Functional setState
    }, [setAttachedFiles]);

    return (
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div
            onDragOver={dragDrop.handleDragOver}
            onDragLeave={dragDrop.handleDragLeave}
            onDrop={dragDrop.handleDrop}
            className={cn(
              "rounded-2xl border p-3 transition-colors relative",
              dragDrop.isDragOver
                ? "border-primary border-dashed bg-primary/10"
                : isWsConnected && isSessionLive
                  ? "border-green-500/30 bg-green-500/5 focus-within:border-green-500/50"
                  : "border-border bg-muted/30 focus-within:border-primary/50"
            )}
          >
            {/* Drag overlay */}
            {dragDrop.isDragOver && (
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
                onClick={contextPicker.addContext}
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
              onRemoveFile={removeAttachedFile}
            />

            {/* Input with @ context picker */}
            <ChatInputField
              chatInput={chatInput}
              isSessionLive={isSessionLive}
              isWsConnected={isWsConnected}
              isTyping={isTyping}
              isWaitingForResponse={isWaitingForResponse}
              showContextPicker={contextPicker.showContextPicker}
              filteredFiles={contextPicker.filteredFiles}
              contextPickerIndex={contextPicker.contextPickerIndex}
              chatInputRef={chatInputRef}
              contextPickerRef={contextPicker.contextPickerRef}
              onChatInputChange={contextPicker.handleChatInputChange}
              onChatKeyDown={chatHandlers.handleChatKeyDown}
              onContextPickerKeyDown={contextPicker.handleContextPickerKeyDown}
              onPaste={contextPicker.handlePaste}
              onSelectContextFile={contextPicker.selectContextFile}
            />

            {/* Bottom row: tools + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {/* File Attachment */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
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
                  onSelect={setSelectedModel}
                  onToggle={toggleModelDropdown}
                  containerRef={modelDropdownRef}
                />

                {/* Web Search Toggle */}
                <button
                  onClick={toggleWebSearch}
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
                  onSelect={setChatPermissionMode}
                  onToggle={togglePermissionDropdown}
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
                  onSendMessage={chatHandlers.sendMessage}
                  onSendCancel={sendCancel}
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
  }
));
