import { useState, useMemo } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../domain/entities';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { BoardFilters } from './BoardFilters';
import { useFilterStore } from '../../shared/stores/filter-store';

interface BoardContainerProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (taskId: string) => void;
}

const COLUMNS: Array<{ status: TaskStatus; title: string }> = [
  { status: 'not-started', title: 'To Do' },
  { status: 'in-progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
];

export function BoardContainer({
  tasks,
  onTaskMove,
  onTaskClick,
}: BoardContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { priorityFilter, searchQuery } = useFilterStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPriority && matchesSearch;
    });
  }, [tasks, priorityFilter, searchQuery]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'not-started': [],
      'in-progress': [],
      review: [],
      done: [],
      cancelled: [],
      archived: [],
    };

    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    onTaskMove(taskId, newStatus);
  };

  const activeTask = activeId
    ? tasks.find((task) => task.id === activeId)
    : null;

  return (
    <div>
      <BoardFilters />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.status}
              status={column.status}
              title={column.title}
              tasks={tasksByStatus[column.status]}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
