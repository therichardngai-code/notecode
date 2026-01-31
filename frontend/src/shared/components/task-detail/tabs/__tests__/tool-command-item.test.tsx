import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCommandItem } from '../tool-command-item';
import type { ToolCommand } from '@/shared/types/task-detail-types';

const defaultProps = {
  messageId: 'msg-1',
  index: 0,
  isExpanded: false,
  onToggle: vi.fn(),
  onSetContentModal: vi.fn(),
  onOpenFileAsTab: vi.fn(),
};

describe('ToolCommandItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders command name', () => {
      const command: ToolCommand = {
        cmd: 'Read',
        status: 'success',
      };

      render(<ToolCommandItem command={command} {...defaultProps} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('shows success icon for successful commands', () => {
      const command: ToolCommand = {
        cmd: 'Write',
        status: 'success',
      };

      const { container } = render(<ToolCommandItem command={command} {...defaultProps} />);

      // CheckCircle icon should be present (has text-green-500 class)
      const successIcon = container.querySelector('.text-green-500');
      expect(successIcon).toBeInTheDocument();
    });

    it('renders without expand arrow when no input', () => {
      const command: ToolCommand = {
        cmd: 'Simple',
        status: 'success',
      };

      const { container } = render(<ToolCommandItem command={command} {...defaultProps} />);

      // Should show Terminal icon instead of chevron
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('expandable behavior', () => {
    it('calls onToggle when clicked with input', () => {
      const onToggle = vi.fn();
      const command: ToolCommand = {
        cmd: 'Read',
        status: 'success',
        input: { file_path: '/path/to/file.ts' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledWith('msg-1-0');
    });

    it('does not call onToggle when clicked without input', () => {
      const onToggle = vi.fn();
      const command: ToolCommand = {
        cmd: 'Simple',
        status: 'success',
      };

      render(<ToolCommandItem command={command} {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('expanded content', () => {
    it('shows file_path when expanded', () => {
      const command: ToolCommand = {
        cmd: 'Read',
        status: 'success',
        input: { file_path: '/src/index.ts' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('/src/index.ts')).toBeInTheDocument();
    });

    it('shows query for WebSearch', () => {
      const command: ToolCommand = {
        cmd: 'WebSearch',
        status: 'success',
        input: { query: 'react hooks tutorial' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('react hooks tutorial')).toBeInTheDocument();
    });

    it('shows command for Bash', () => {
      const command: ToolCommand = {
        cmd: 'Bash',
        status: 'success',
        input: { command: 'npm install' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('npm install')).toBeInTheDocument();
    });

    it('shows pattern for Grep/Glob', () => {
      const command: ToolCommand = {
        cmd: 'Grep',
        status: 'success',
        input: { pattern: '*.tsx' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('*.tsx')).toBeInTheDocument();
    });

    it('shows url for WebFetch', () => {
      const command: ToolCommand = {
        cmd: 'WebFetch',
        status: 'success',
        input: { url: 'https://example.com/api' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('https://example.com/api')).toBeInTheDocument();
    });

    it('shows content preview with truncation', () => {
      const longContent = 'a'.repeat(600);
      const command: ToolCommand = {
        cmd: 'Write',
        status: 'success',
        input: { file_path: '/test.ts', content: longContent },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      // Should show truncated content with ...
      const pre = screen.getByText(/^a+\.\.\.$/);
      expect(pre).toBeInTheDocument();
    });

    it('does not show expanded content when isExpanded is false', () => {
      const command: ToolCommand = {
        cmd: 'Read',
        status: 'success',
        input: { file_path: '/hidden/file.ts' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText('/hidden/file.ts')).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders action buttons for content', () => {
      const command: ToolCommand = {
        cmd: 'Write',
        status: 'success',
        input: { file_path: '/test.ts', content: 'test content' },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      // Should have Copy, Eye (modal), and ExternalLink (tab) buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3); // main button + action buttons
    });

    it('calls onSetContentModal when view button clicked', () => {
      const onSetContentModal = vi.fn();
      const command: ToolCommand = {
        cmd: 'Write',
        status: 'success',
        input: { file_path: '/test.ts', content: 'test content' },
      };

      render(
        <ToolCommandItem
          command={command}
          {...defaultProps}
          isExpanded={true}
          onSetContentModal={onSetContentModal}
        />
      );

      const viewButton = screen.getByTitle('View in modal');
      fireEvent.click(viewButton);

      expect(onSetContentModal).toHaveBeenCalledWith({
        filePath: '/test.ts',
        content: 'test content',
      });
    });

    it('calls onOpenFileAsTab when open tab button clicked', () => {
      const onOpenFileAsTab = vi.fn();
      const command: ToolCommand = {
        cmd: 'Write',
        status: 'success',
        input: { file_path: '/test.ts', content: 'test content' },
      };

      render(
        <ToolCommandItem
          command={command}
          {...defaultProps}
          isExpanded={true}
          onOpenFileAsTab={onOpenFileAsTab}
        />
      );

      const openTabButton = screen.getByTitle('Open in new tab');
      fireEvent.click(openTabButton);

      expect(onOpenFileAsTab).toHaveBeenCalledWith('/test.ts', 'test content');
    });
  });

  describe('todos rendering', () => {
    it('renders todos list', () => {
      const command: ToolCommand = {
        cmd: 'TodoWrite',
        status: 'success',
        input: {
          todos: [
            { content: 'Task 1', status: 'completed' },
            { content: 'Task 2', status: 'in_progress' },
            { content: 'Task 3', status: 'pending' },
          ],
        },
      };

      render(<ToolCommandItem command={command} {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });
  });
});
