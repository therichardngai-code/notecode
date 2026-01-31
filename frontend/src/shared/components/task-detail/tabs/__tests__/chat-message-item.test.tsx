import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageItem } from '../chat-message-item';
import type { ChatMessage } from '@/shared/types/task-detail-types';

// Mock MarkdownMessage
vi.mock('@/shared/components/ui/markdown-message', () => ({
  MarkdownMessage: ({ content }: { content: string }) => (
    <div data-testid="markdown-message">{content}</div>
  ),
}));

// Mock ToolCommandItem
vi.mock('../tool-command-item', () => ({
  ToolCommandItem: ({ command }: { command: { cmd: string } }) => (
    <div data-testid="tool-command">{command.cmd}</div>
  ),
}));

const defaultProps = {
  expandedCommands: new Set<string>(),
  onToggleCommand: vi.fn(),
  onSetContentModal: vi.fn(),
  onOpenFileAsTab: vi.fn(),
};

describe('ChatMessageItem', () => {
  describe('user messages', () => {
    it('renders user message with correct styling', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, assistant!',
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      expect(screen.getByText('Hello, assistant!')).toBeInTheDocument();
    });

    it('renders user message right-aligned', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
      };

      const { container } = render(<ChatMessageItem message={message} {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('justify-end');
    });
  });

  describe('assistant messages', () => {
    it('renders assistant message with markdown', () => {
      const message: ChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: '**Bold** response',
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      expect(screen.getByTestId('markdown-message')).toHaveTextContent('**Bold** response');
    });

    it('renders file metadata when present', () => {
      const message: ChatMessage = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Created file',
        files: [{ name: 'test.ts', additions: 10, deletions: 2 }],
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      expect(screen.getByText('test.ts')).toBeInTheDocument();
      expect(screen.getByText('+10')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('renders multiple files', () => {
      const message: ChatMessage = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Modified files',
        files: [
          { name: 'file1.ts', additions: 5 },
          { name: 'file2.ts', additions: 3 },
        ],
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      expect(screen.getByText('file1.ts')).toBeInTheDocument();
      expect(screen.getByText('file2.ts')).toBeInTheDocument();
    });

    it('renders tool commands when present', () => {
      const message: ChatMessage = {
        id: 'msg-5',
        role: 'assistant',
        content: 'Running commands',
        commands: [
          { cmd: 'Read file.ts', status: 'success' },
          { cmd: 'Write output.ts', status: 'success' },
        ],
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      const commands = screen.getAllByTestId('tool-command');
      expect(commands).toHaveLength(2);
      expect(commands[0]).toHaveTextContent('Read file.ts');
      expect(commands[1]).toHaveTextContent('Write output.ts');
    });

    it('does not render commands section when no commands', () => {
      const message: ChatMessage = {
        id: 'msg-6',
        role: 'assistant',
        content: 'No commands here',
      };

      render(<ChatMessageItem message={message} {...defaultProps} />);

      expect(screen.queryByTestId('tool-command')).not.toBeInTheDocument();
    });
  });
});
