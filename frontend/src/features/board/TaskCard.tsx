import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../domain/entities';

interface TaskCardProps {
  task: Task;
  onClick?: (taskId: string) => void;
}

const priorityColors = {
  high: 'bg-red-100 border-red-300',
  medium: 'bg-yellow-100 border-yellow-300',
  low: 'bg-green-100 border-green-300',
};

const priorityLabels = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task.id)}
      className={`glass rounded-lg p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-xl' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm flex-1">
          {task.title}
        </h3>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            priorityColors[task.priority]
          }`}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>

      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
        {task.description}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {task.agentRole}
        </span>
        {task.assignee && (
          <span className="text-gray-700 font-medium">{task.assignee}</span>
        )}
      </div>

      {task.dueDate && (
        <div className="mt-2 text-xs text-gray-500">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
