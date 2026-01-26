import { useState, useCallback, useRef, useEffect } from 'react';

interface UseChatInputOptions {
  maxLength?: number;
  onSend?: (content: string, attachments?: File[]) => void;
  disabled?: boolean;
}

interface UseChatInputReturn {
  value: string;
  setValue: (value: string) => void;
  attachments: File[];
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  send: () => void;
  clear: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  autoResize: () => void;
}

export function useChatInput({
  maxLength = 10000,
  onSend,
  disabled = false,
}: UseChatInputOptions = {}): UseChatInputReturn {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleSetValue = useCallback(
    (newValue: string) => {
      if (newValue.length <= maxLength) {
        setValue(newValue);
      }
    },
    [maxLength]
  );

  const addAttachment = useCallback((file: File) => {
    setAttachments((prev) => [...prev, file]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const send = useCallback(() => {
    if (!value.trim() || disabled) return;

    onSend?.(value, attachments);
    setValue('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, attachments, disabled, onSend]);

  const clear = useCallback(() => {
    setValue('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  return {
    value,
    setValue: handleSetValue,
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    send,
    clear,
    textareaRef,
    autoResize,
  };
}
