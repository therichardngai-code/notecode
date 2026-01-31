import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it('renders "Not Started" status correctly', () => {
    render(<StatusBadge status="not-started" />);
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('renders "In Progress" status correctly', () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders "Review" status correctly', () => {
    render(<StatusBadge status="review" />);
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders "Done" status correctly', () => {
    render(<StatusBadge status="done" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders "Cancelled" status correctly', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders "Archived" status correctly', () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('applies correct styling from config', () => {
    const { container } = render(<StatusBadge status="in-progress" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ color: '#447FC1' });
  });
});
