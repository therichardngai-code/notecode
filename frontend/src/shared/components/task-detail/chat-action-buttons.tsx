import { memo } from 'react';
import { X, Sparkles, Play, RotateCcw, Loader2 } from 'lucide-react';
import type { Task } from '@/adapters/api/tasks-api';

interface ChatActionButtonsProps {
  // Task state
  task: Task;
  isSessionLive: boolean;
  isWsConnected: boolean;
  isStartingSession: boolean;
  isUpdating: boolean;
  isWaitingForResponse: boolean;

  // Input state
  chatInput: string;

  // Actions
  onSendMessage: (input: string) => void;
  onSendCancel: () => void;
  onStartTask: () => void;
  onStartSessionWithMode: (mode: 'retry') => void;
  onCancelTask: () => void;
  onContinueTask: () => void;
}

/**
 * ChatActionButtons - Conditional action buttons based on task/session state
 *
 * Renders different action buttons depending on state:
 * 1. Cancel (if waiting for response + session live)
 * 2. Send (if session live + connected)
 * 3. Start (if task not started)
 * 4. Resume (if task in-progress but no live session)
 * 5. Cancel (if task in-progress with live session)
 * 6. Continue (default fallback)
 */
export const ChatActionButtons = memo(function ChatActionButtons({
  task,
  isSessionLive,
  isWsConnected,
  isStartingSession,
  isUpdating,
  isWaitingForResponse,
  chatInput,
  onSendMessage,
  onSendCancel,
  onStartTask,
  onStartSessionWithMode,
  onCancelTask,
  onContinueTask,
}: ChatActionButtonsProps) {
  // Conditional rendering based on state hierarchy
  if (isWaitingForResponse && isSessionLive) {
    return (
      <button
        onClick={onSendCancel}
        className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium"
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </button>
    );
  }

  if (isSessionLive && isWsConnected) {
    return (
      <button
        onClick={() => onSendMessage(chatInput)}
        disabled={!chatInput.trim() || isWaitingForResponse}
        className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Send
      </button>
    );
  }

  if (task.status === 'not-started') {
    return (
      <button
        onClick={onStartTask}
        disabled={isUpdating}
        className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5" />
        Start
      </button>
    );
  }

  if (task.status === 'in-progress' && !isSessionLive) {
    return (
      <button
        onClick={() => onStartSessionWithMode('retry')}
        disabled={isStartingSession}
        className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
      >
        {isStartingSession ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5" />
        )}
        Resume
      </button>
    );
  }

  if (task.status === 'in-progress') {
    return (
      <button
        onClick={onCancelTask}
        disabled={isUpdating}
        className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </button>
    );
  }

  // Default: Continue button
  return (
    <button
      onClick={onContinueTask}
      disabled={isUpdating}
      className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
    >
      <Play className="w-3.5 h-3.5" />
      Continue
    </button>
  );
});
