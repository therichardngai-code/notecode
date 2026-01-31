/**
 * Status Badge component - displays task status with icon and color
 */

import { memo } from 'react';
import { Clock, Play, Pause, CheckCircle, Archive } from 'lucide-react';
import { statusConfig, type StatusId } from '@/shared/config/task-config';

const iconMap: Record<StatusId, React.ElementType> = {
  'not-started': Clock,
  'in-progress': Play,
  'review': Pause,
  'done': CheckCircle,
  'cancelled': Clock,
  'archived': Archive,
};

export interface StatusBadgeProps {
  status: StatusId;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = iconMap[status];

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
});
