import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatActionButtons } from '../chat-action-buttons';
import type { Task } from '@/adapters/api/tasks-api';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  projectId: 'proj-1',
  agentId: null,
  parentId: null,
  dependencies: [],
  title: 'Test Task',
  description: '',
  status: 'not-started',
  priority: 'medium',
  assignee: null,
  dueDate: null,
  agentRole: null,
  provider: null,
  model: null,
  skills: [],
  tools: null,
  contextFiles: [],
  workflowStage: null,
  createdAt: '2026-01-31T00:00:00Z',
  updatedAt: '2026-01-31T00:00:00Z',
  startedAt: null,
  completedAt: null,
  ...overrides,
});

const defaultProps = {
  task: createMockTask(),
  isSessionLive: false,
  isWsConnected: false,
  isStartingSession: false,
  isUpdating: false,
  isWaitingForResponse: false,
  chatInput: '',
  onSendMessage: vi.fn(),
  onSendCancel: vi.fn(),
  onStartTask: vi.fn(),
  onStartSessionWithMode: vi.fn(),
  onCancelTask: vi.fn(),
  onContinueTask: vi.fn(),
};

describe('ChatActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cancel button (waiting for response)', () => {
    it('shows Cancel when waiting for response and session live', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          isWaitingForResponse={true}
          isSessionLive={true}
        />
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onSendCancel when Cancel clicked', () => {
      const onSendCancel = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          isWaitingForResponse={true}
          isSessionLive={true}
          onSendCancel={onSendCancel}
        />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(onSendCancel).toHaveBeenCalled();
    });
  });

  describe('Send button (session live)', () => {
    it('shows Send when session live and connected', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          isSessionLive={true}
          isWsConnected={true}
        />
      );
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('disables Send when chatInput is empty', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          isSessionLive={true}
          isWsConnected={true}
          chatInput=""
        />
      );
      expect(screen.getByText('Send').closest('button')).toBeDisabled();
    });

    it('enables Send when chatInput has content', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          isSessionLive={true}
          isWsConnected={true}
          chatInput="Hello"
        />
      );
      expect(screen.getByText('Send').closest('button')).not.toBeDisabled();
    });

    it('calls onSendMessage with input when Send clicked', () => {
      const onSendMessage = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          isSessionLive={true}
          isWsConnected={true}
          chatInput="Test message"
          onSendMessage={onSendMessage}
        />
      );
      fireEvent.click(screen.getByText('Send'));
      expect(onSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Start button (not started)', () => {
    it('shows Start when task is not-started', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'not-started' })}
        />
      );
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('calls onStartTask when Start clicked', () => {
      const onStartTask = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'not-started' })}
          onStartTask={onStartTask}
        />
      );
      fireEvent.click(screen.getByText('Start'));
      expect(onStartTask).toHaveBeenCalled();
    });

    it('disables Start when isUpdating', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'not-started' })}
          isUpdating={true}
        />
      );
      expect(screen.getByText('Start').closest('button')).toBeDisabled();
    });
  });

  describe('Resume button (in-progress, no live session)', () => {
    it('shows Resume when in-progress and no live session', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'in-progress' })}
          isSessionLive={false}
        />
      );
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    it('calls onStartSessionWithMode with retry when Resume clicked', () => {
      const onStartSessionWithMode = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'in-progress' })}
          isSessionLive={false}
          onStartSessionWithMode={onStartSessionWithMode}
        />
      );
      fireEvent.click(screen.getByText('Resume'));
      expect(onStartSessionWithMode).toHaveBeenCalledWith('retry');
    });
  });

  describe('Cancel button (in-progress with live session)', () => {
    it('shows Cancel when in-progress with live session (not ws connected)', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'in-progress' })}
          isSessionLive={true}
          isWsConnected={false}
        />
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onCancelTask when Cancel clicked', () => {
      const onCancelTask = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'in-progress' })}
          isSessionLive={true}
          isWsConnected={false}
          onCancelTask={onCancelTask}
        />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancelTask).toHaveBeenCalled();
    });
  });

  describe('Continue button (default)', () => {
    it('shows Continue for done tasks', () => {
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'done' })}
        />
      );
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('calls onContinueTask when Continue clicked', () => {
      const onContinueTask = vi.fn();
      render(
        <ChatActionButtons
          {...defaultProps}
          task={createMockTask({ status: 'done' })}
          onContinueTask={onContinueTask}
        />
      );
      fireEvent.click(screen.getByText('Continue'));
      expect(onContinueTask).toHaveBeenCalled();
    });
  });
});
