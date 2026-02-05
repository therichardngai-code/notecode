import { useState, useRef, useCallback, useEffect } from 'react';
import { filesApi } from '@/adapters/api';

interface ContextPickerParams {
  projectId: string | null;
  chatInput: string;
  setChatInput: (value: string) => void;
  attachedFiles: string[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useContextPicker({
  projectId,
  chatInput,
  setChatInput,
  attachedFiles,
  setAttachedFiles,
  chatInputRef,
}: ContextPickerParams) {
  // @ mention context picker state
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [contextPickerIndex, setContextPickerIndex] = useState(0);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const contextPickerRef = useRef<HTMLDivElement>(null);

  // Debounced file search API call
  useEffect(() => {
    if (!showContextPicker || !projectId) {
      setFilteredFiles([]);
      return;
    }
    const query = contextSearch.trim() || '';
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      filesApi.search(projectId, query)
        .then((res: { results: Array<{ path: string; name: string }> }) => {
          setFilteredFiles(res.results.slice(0, 10).map(f => f.path));
        })
        .catch(() => setFilteredFiles([]))
        .finally(() => setIsSearching(false));
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [contextSearch, showContextPicker, projectId]);

  // Close context picker on click outside
  useEffect(() => {
    if (!showContextPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextPickerRef.current && !contextPickerRef.current.contains(e.target as Node)) setShowContextPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextPicker]);

  // Reset picker index when search changes
  useEffect(() => { setContextPickerIndex(0); }, [contextSearch]);

  // Handle paste from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file.name);
      }
    }
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
  }, [setAttachedFiles]);

  // Handle input change - detect @ trigger
  const handleChatInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setChatInput(value);
    setCursorPosition(cursorPos);
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setContextSearch(textAfterAt);
        setShowContextPicker(true);
        return;
      }
    }
    setShowContextPicker(false);
  }, [setChatInput]);

  // Select file from context picker
  const selectContextFile = useCallback((file: string) => {
    const textBeforeCursor = chatInput.slice(0, cursorPosition);
    const textAfterCursor = chatInput.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${file} ` + textAfterCursor;
    setChatInput(newText);
    setShowContextPicker(false);
    setContextSearch('');
    if (!attachedFiles.includes(file)) setAttachedFiles(prev => [...prev, file]);
    chatInputRef.current?.focus();
  }, [chatInput, cursorPosition, attachedFiles, setChatInput, setAttachedFiles, chatInputRef]);

  // Handle keyboard navigation in context picker
  // Only preventDefault when we actually consume the event
  const handleContextPickerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showContextPicker) return;
    if (e.key === 'ArrowDown' && filteredFiles.length > 0) {
      e.preventDefault();
      setContextPickerIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp' && filteredFiles.length > 0) {
      e.preventDefault();
      setContextPickerIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles.length > 0) {
      e.preventDefault();
      selectContextFile(filteredFiles[contextPickerIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowContextPicker(false);
    }
    // If no files and Enter pressed, don't preventDefault - let parent handle it
  }, [showContextPicker, filteredFiles, contextPickerIndex, selectContextFile]);

  // Add context mention helper
  const addContext = useCallback(() => {
    setChatInput(chatInput + '@');
    setShowContextPicker(true);
    chatInputRef.current?.focus();
  }, [chatInput, setChatInput, chatInputRef]);

  return {
    showContextPicker,
    contextPickerIndex,
    contextPickerRef,
    filteredFiles,
    isSearching,
    handleChatInputChange,
    handleContextPickerKeyDown,
    handlePaste,
    selectContextFile,
    addContext,
  };
}
