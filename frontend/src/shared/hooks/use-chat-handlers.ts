import type { ChatMessage } from '@/shared/types';
import type { UserInputMessage } from './use-session-websocket';

interface ChatHandlersParams {
  isWsConnected: boolean;
  isSessionLive: boolean;
  chatInput: string;
  attachedFiles: string[];
  selectedModel: 'default' | 'haiku' | 'sonnet' | 'opus';
  chatPermissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  webSearchEnabled: boolean;
  isWaitingForResponse: boolean;
  isTyping: boolean;
  showContextPicker: boolean;
  sendUserInput: (content: string, options?: Omit<UserInputMessage, 'type' | 'content'>) => void;
  setRealtimeMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  setAttachedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatHandlers({
  isWsConnected,
  isSessionLive,
  chatInput,
  attachedFiles,
  selectedModel,
  chatPermissionMode,
  webSearchEnabled,
  isWaitingForResponse,
  isTyping,
  showContextPicker,
  sendUserInput,
  setRealtimeMessages,
  setChatInput,
  setAttachedFiles,
  setIsWaitingForResponse,
  setCurrentAssistantMessage,
  setIsTyping,
}: ChatHandlersParams) {
  // Chat handler - use WebSocket when connected
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (isWaitingForResponse || isTyping) return;

    // Build message content with attached files
    let fullContent = content.trim();
    if (attachedFiles.length > 0) {
      const filesContext = attachedFiles.map(f => `@${f}`).join(' ');
      fullContent = `${filesContext}\n\n${fullContent}`;
    }

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: fullContent };

    // If WebSocket is connected (session running), send via WebSocket
    if (isWsConnected && isSessionLive) {
      setRealtimeMessages(prev => [...prev, userMessage]);
      setChatInput('');
      setAttachedFiles([]);
      setIsWaitingForResponse(true);
      setCurrentAssistantMessage('');
      sendUserInput(content.trim(), {
        model: selectedModel !== 'default' ? `claude-3-5-${selectedModel}-latest` : undefined,
        permissionMode: chatPermissionMode !== 'default' ? chatPermissionMode : undefined,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
        disableWebTools: !webSearchEnabled, // true = disable web search
      });
    } else {
      // Fallback: just add to local messages (no active session)
      setChatInput('');
      setAttachedFiles([]);
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showContextPicker) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  return {
    sendMessage,
    handleChatKeyDown,
  };
}
