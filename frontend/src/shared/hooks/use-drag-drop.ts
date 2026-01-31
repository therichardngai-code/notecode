import { useState, useCallback } from 'react';

interface DragDropParams {
  setAttachedFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useDragDrop({ setAttachedFiles }: DragDropParams) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const filePaths = Array.from(files).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...filePaths]);
    }
  }, [setAttachedFiles]);

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
