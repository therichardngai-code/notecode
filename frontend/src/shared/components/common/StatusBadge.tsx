import { cn } from '@/shared/lib/utils';

type StatusId = 'not-started' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'archived';

const statusColors: Record<StatusId, string> = {
  'not-started': 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'review': 'bg-yellow-100 text-yellow-800',
  'done': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800',
  'archived': 'bg-gray-50 text-gray-500',
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
