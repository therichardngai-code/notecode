import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionControls } from '../session-controls';
import type { Session } from '@/adapters/api/sessions-api';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-1',
  taskId: 'task-1',
  status: 'failed',
  createdAt: '2026-01-31T00:00:00Z',
  attemptNumber: 1,
  ...overrides,
});

describe('SessionControls', () => {
  it('renders when session is failed', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    expect(screen.getByText('Session Failed')).toBeInTheDocument();
  });

  it('renders when session is completed', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'completed' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    expect(screen.getByText('Session Completed')).toBeInTheDocument();
  });

  it('renders when session is cancelled', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'cancelled' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    expect(screen.getByText('Session Cancelled')).toBeInTheDocument();
  });

  it('does not render for running session', () => {
    const onStartSession = vi.fn();
    const { container } = render(
      <SessionControls
        session={createMockSession({ status: 'running' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onStartSession with "retry" when Retry clicked', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(onStartSession).toHaveBeenCalledWith('retry');
  });

  it('calls onStartSession with "renew" when Renew clicked', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByText('Renew'));
    expect(onStartSession).toHaveBeenCalledWith('renew');
  });

  it('calls onStartSession with "fork" when Fork clicked', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed' })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByText('Fork'));
    expect(onStartSession).toHaveBeenCalledWith('fork');
  });

  it('disables buttons when isLoading is true', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed' })}
        onStartSession={onStartSession}
        isLoading={true}
      />
    );
    expect(screen.getByText('Retry').closest('button')).toBeDisabled();
    expect(screen.getByText('Renew').closest('button')).toBeDisabled();
    expect(screen.getByText('Fork').closest('button')).toBeDisabled();
  });

  it('shows attempt number when greater than 1', () => {
    const onStartSession = vi.fn();
    render(
      <SessionControls
        session={createMockSession({ status: 'failed', attemptNumber: 3 })}
        onStartSession={onStartSession}
        isLoading={false}
      />
    );
    expect(screen.getByText('Attempt #3')).toBeInTheDocument();
  });
});
