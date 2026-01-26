import { cn } from '@/shared/lib/utils';

type PriorityId = 'high' | 'medium' | 'low';

const priorityColors: Record<PriorityId, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const priorityLabels: Record<PriorityId, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface PriorityBadgeProps {
  priority: PriorityId;
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        priorityColors[priority],
        className
      )}
    >
      {priorityLabels[priority]}
    </span>
  );
};
