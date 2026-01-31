/**
 * Chat input state management
 * Isolated to prevent parent component re-renders
 * ENHANCED: Now covers ALL chat input options (model, permissions, dropdowns, drag/drop, context picker)
 */

import { useState, useCallback, useRef } from 'react';

export interface UseChatInputReturn {
  // Basic input
  input: string;
  setInput: (value: string) => void;
  clearInput: () => void;

  // Attached files
  attachedFiles: string[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  addFile: (file: string) => void;
  removeFile: (file: string) => void;
  clearFiles: () => void;

  // AI model selection
  selectedModel: 'default' | 'haiku' | 'sonnet' | 'opus';
  setSelectedModel: React.Dispatch<React.SetStateAction<'default' | 'haiku' | 'sonnet' | 'opus'>>;

  // Web search toggle
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;

  // Permission mode
  chatPermissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  setChatPermissionMode: React.Dispatch<React.SetStateAction<'default' | 'acceptEdits' | 'bypassPermissions'>>;

  // Dropdown visibility
  showModelDropdown: boolean;
  setShowModelDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  showPermissionDropdown: boolean;
  setShowPermissionDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  toggleModelDropdown: () => void;
  togglePermissionDropdown: () => void;

  // Drag and drop
  isDragOver: boolean;
  setIsDragOver: React.Dispatch<React.SetStateAction<boolean>>;

  // @ mention context picker
  showContextPicker: boolean;
  setShowContextPicker: React.Dispatch<React.SetStateAction<boolean>>;
  contextSearch: string;
  setContextSearch: React.Dispatch<React.SetStateAction<string>>;
  cursorPosition: number;
  setCursorPosition: React.Dispatch<React.SetStateAction<number>>;
  contextPickerIndex: number;
  setContextPickerIndex: React.Dispatch<React.SetStateAction<number>>;

  // Refs
  chatInputRef: React.MutableRefObject<HTMLInputElement | null>;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  contextPickerRef: React.MutableRefObject<HTMLDivElement | null>;
  modelDropdownRef: React.MutableRefObject<HTMLDivElement | null>;
  permissionDropdownRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useChatInput(): UseChatInputReturn {
  // Basic input
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  // AI options
  const [selectedModel, setSelectedModel] = useState<'default' | 'haiku' | 'sonnet' | 'opus'>('default');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [chatPermissionMode, setChatPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('default');

  // Dropdown states
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);

  // Drag and drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Context picker
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [contextPickerIndex, setContextPickerIndex] = useState(0);

  // Refs
  const chatInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextPickerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);

  // Callbacks
  const clearInput = useCallback(() => {
    setInput('');
  }, []);

  const addFile = useCallback((file: string) => {
    setAttachedFiles(prev => [...prev, file]);
  }, []);

  const removeFile = useCallback((file: string) => {
    setAttachedFiles(prev => prev.filter(f => f !== file));
  }, []);

  const clearFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  const toggleModelDropdown = useCallback(() => {
    setShowModelDropdown(prev => !prev);
    setShowPermissionDropdown(false); // Close other dropdown
  }, []);

  const togglePermissionDropdown = useCallback(() => {
    setShowPermissionDropdown(prev => !prev);
    setShowModelDropdown(false); // Close other dropdown
  }, []);

  return {
    input,
    setInput,
    clearInput,
    attachedFiles,
    setAttachedFiles,
    addFile,
    removeFile,
    clearFiles,
    selectedModel,
    setSelectedModel,
    webSearchEnabled,
    setWebSearchEnabled,
    chatPermissionMode,
    setChatPermissionMode,
    showModelDropdown,
    setShowModelDropdown,
    showPermissionDropdown,
    setShowPermissionDropdown,
    toggleModelDropdown,
    togglePermissionDropdown,
    isDragOver,
    setIsDragOver,
    showContextPicker,
    setShowContextPicker,
    contextSearch,
    setContextSearch,
    cursorPosition,
    setCursorPosition,
    contextPickerIndex,
    setContextPickerIndex,
    chatInputRef,
    fileInputRef,
    contextPickerRef,
    modelDropdownRef,
    permissionDropdownRef,
  };
}
