import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../priority-badge';

describe('PriorityBadge', () => {
  it('renders high priority correctly', () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders medium priority correctly', () => {
    render(<PriorityBadge priority="medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders low priority correctly', () => {
    render(<PriorityBadge priority="low" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('returns null when priority is undefined', () => {
    const { container } = render(<PriorityBadge priority={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies correct color for high priority', () => {
    render(<PriorityBadge priority="high" />);
    const badge = screen.getByText('High');
    expect(badge).toHaveStyle({ color: '#C15746' });
  });

  it('applies correct color for medium priority', () => {
    render(<PriorityBadge priority="medium" />);
    const badge = screen.getByText('Medium');
    expect(badge).toHaveStyle({ color: '#C69F3A' });
  });

  it('applies correct color for low priority', () => {
    render(<PriorityBadge priority="low" />);
    const badge = screen.getByText('Low');
    expect(badge).toHaveStyle({ color: '#447FC1' });
  });
});
