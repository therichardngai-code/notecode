import { cn } from '@/shared/lib/utils';

type StatusId = 'not-started' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'archived';

const statusColors: Record<StatusId, string> = {
  'not-started': 'bg-secondary text-secondary-foreground',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'archived': 'bg-muted text-muted-foreground',
};

const statusLabels: Record<StatusId, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'review': 'Review',
  'done': 'Done',
  'cancelled': 'Cancelled',
  'archived': 'Archived',
};

interface StatusBadgeProps {
  status: StatusId;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusColors[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
};
