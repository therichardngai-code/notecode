import { useState, useCallback } from 'react';

type ModelType = 'default' | 'haiku' | 'sonnet' | 'opus';
type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';

/**
 * Manages chat input state (isolated from parent component)
 *
 * Follows rerender-defer-reads pattern - parent doesn't subscribe to state changes.
 * Parent reads values on-demand via exposed methods only.
 *
 * This prevents parent component re-renders on every keystroke,
 * improving performance by localizing re-renders to ChatInputFooter only.
 */
export function useChatInputState() {
  // Chat input and attachments
  const [chatInput, setChatInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  // Chat configuration
  const [selectedModel, setSelectedModel] = useState<ModelType>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [chatPermissionMode, setChatPermissionMode] = useState<PermissionMode>('default');

  // UI state (dropdowns only - isTyping managed at parent level)
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);

  // Stable methods (useCallback for parent ref stability)
  const getChatInput = useCallback(() => chatInput.trim(), [chatInput]);

  const clearChatInput = useCallback(() => {
    setChatInput('');
    setAttachedFiles([]);
  }, []);

  // Functional setState pattern for toggles (prevents stale closures)
  const toggleWebSearch = useCallback(() => {
    setWebSearchEnabled(prev => !prev);
  }, []);

  const toggleModelDropdown = useCallback(() => {
    setShowModelDropdown(prev => !prev);
  }, []);

  const togglePermissionDropdown = useCallback(() => {
    setShowPermissionDropdown(prev => !prev);
  }, []);

  return {
    // State
    chatInput,
    attachedFiles,
    selectedModel,
    webSearchEnabled,
    chatPermissionMode,
    showModelDropdown,
    showPermissionDropdown,
    // Setters
    setChatInput,
    setAttachedFiles,
    setSelectedModel,
    setChatPermissionMode,
    setShowModelDropdown,
    setShowPermissionDropdown,
    // Stable methods for parent
    getChatInput,
    clearChatInput,
    toggleWebSearch,
    toggleModelDropdown,
    togglePermissionDropdown,
  };
}
