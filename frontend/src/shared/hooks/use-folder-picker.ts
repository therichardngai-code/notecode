/**
 * Folder Picker Hook
 * Wrapper for native OS folder picker via backend API
 */

import { useState, useCallback } from 'react';
import { systemApi, type SelectFolderResponse } from '@/adapters/api/system-api';

interface UseFolderPickerOptions {
  onSelect?: (path: string, name: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export function useFolderPicker(options: UseFolderPickerOptions = {}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastResult, setLastResult] = useState<SelectFolderResponse | null>(null);

  const selectFolder = useCallback(async (title?: string, initialPath?: string) => {
    setIsSelecting(true);

    try {
      const result = await systemApi.selectFolder({ title, initialPath });
      setLastResult(result);

      if (result.cancelled) {
        options.onCancel?.();
        return null;
      }

      if (result.error) {
        options.onError?.(result.error);
        return null;
      }

      if (result.path && result.name) {
        options.onSelect?.(result.path, result.name);
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open folder picker';
      options.onError?.(msg);
      return null;
    } finally {
      setIsSelecting(false);
    }
  }, [options]);

  return { selectFolder, isSelecting, lastResult };
}
