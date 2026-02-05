import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../domain/entities';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

const statusColors: Record<string, string> = {
  'not-started': 'bg-muted border-border',
  'in-progress': 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800',
  review: 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800',
  done: 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800',
};

export function BoardColumn({
  status,
  title,
  tasks,
  onTaskClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex-1 min-w-[280px]">
      <div className="mb-4">
        <h2 className="font-bold text-foreground text-lg flex items-center justify-between">
          {title}
          <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </h2>
      </div>

      <div
        ref={setNodeRef}
        className={`rounded-lg border-2 p-3 min-h-[500px] transition-colors ${
          statusColors[status] || 'bg-muted border-border'
        } ${isOver ? 'ring-2 ring-primary border-primary' : ''}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
