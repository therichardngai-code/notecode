/**
 * Chat input state management
 * Isolated to prevent parent component re-renders
 */

import { useState, useCallback } from 'react';

export interface UseChatInputReturn {
  input: string;
  setInput: (value: string) => void;
  clearInput: () => void;
  attachedFiles: string[];
  addFile: (file: string) => void;
  removeFile: (file: string) => void;
  clearFiles: () => void;
}

export function useChatInput(): UseChatInputReturn {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

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

  return {
    input,
    setInput,
    clearInput,
    attachedFiles,
    addFile,
    removeFile,
    clearFiles,
  };
}
