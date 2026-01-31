import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatInput } from '../use-chat-input';

describe('useChatInput', () => {
  describe('input state', () => {
    it('initializes with empty input', () => {
      const { result } = renderHook(() => useChatInput());
      expect(result.current.input).toBe('');
    });

    it('updates input value with setInput', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.setInput('Hello world');
      });

      expect(result.current.input).toBe('Hello world');
    });

    it('clears input with clearInput', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.setInput('Some text');
      });
      expect(result.current.input).toBe('Some text');

      act(() => {
        result.current.clearInput();
      });
      expect(result.current.input).toBe('');
    });
  });

  describe('file attachments', () => {
    it('initializes with empty attachedFiles', () => {
      const { result } = renderHook(() => useChatInput());
      expect(result.current.attachedFiles).toEqual([]);
    });

    it('adds file with addFile', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.addFile('file1.txt');
      });

      expect(result.current.attachedFiles).toEqual(['file1.txt']);
    });

    it('adds multiple files', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.addFile('file1.txt');
        result.current.addFile('file2.txt');
      });

      expect(result.current.attachedFiles).toEqual(['file1.txt', 'file2.txt']);
    });

    it('removes file with removeFile', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.addFile('file1.txt');
        result.current.addFile('file2.txt');
      });

      act(() => {
        result.current.removeFile('file1.txt');
      });

      expect(result.current.attachedFiles).toEqual(['file2.txt']);
    });

    it('clears all files with clearFiles', () => {
      const { result } = renderHook(() => useChatInput());

      act(() => {
        result.current.addFile('file1.txt');
        result.current.addFile('file2.txt');
      });

      act(() => {
        result.current.clearFiles();
      });

      expect(result.current.attachedFiles).toEqual([]);
    });
  });

  describe('callback stability', () => {
    it('clearInput maintains same reference across renders', () => {
      const { result, rerender } = renderHook(() => useChatInput());
      const clearInput1 = result.current.clearInput;

      rerender();

      expect(result.current.clearInput).toBe(clearInput1);
    });

    it('addFile maintains same reference across renders', () => {
      const { result, rerender } = renderHook(() => useChatInput());
      const addFile1 = result.current.addFile;

      rerender();

      expect(result.current.addFile).toBe(addFile1);
    });
  });
});
