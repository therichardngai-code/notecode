/**
 * Priority Badge component - displays task priority with color
 */

import { memo } from 'react';
import { priorityConfig } from '@/shared/config/task-config';

export interface PriorityBadgeProps {
  priority?: 'low' | 'medium' | 'high';
}

export const PriorityBadge = memo(function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) return null;

  const config = priorityConfig[priority];

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {config.label}
    </span>
  );
});
