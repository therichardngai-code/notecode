import type { ITaskRepository } from '../domain/ports/repositories';
import type { Task, TaskStatus } from '../domain/entities';

export interface MoveTaskInput {
  taskId: string;
  newStatus: TaskStatus;
}

export class MoveTaskUseCase {
  private taskRepository: ITaskRepository;

  constructor(taskRepository: ITaskRepository) {
    this.taskRepository = taskRepository;
  }

  async execute(input: MoveTaskInput): Promise<Task> {
    const task = await this.taskRepository.findById(input.taskId);

    if (!task) {
      throw new Error(`Task with id ${input.taskId} not found`);
    }

    const updates: Partial<Task> = {
      status: input.newStatus,
    };

    // Set timestamps based on status changes
    if (input.newStatus === 'in-progress' && !task.startedAt) {
      updates.startedAt = new Date();
    }

    if (input.newStatus === 'done' && !task.completedAt) {
      updates.completedAt = new Date();
    }

    return await this.taskRepository.updateStatus(input.taskId, input.newStatus);
  }
}
