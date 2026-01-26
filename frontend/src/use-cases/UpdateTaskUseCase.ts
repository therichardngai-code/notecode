import type { ITaskRepository } from '../domain/ports/repositories';
import type { Task } from '../domain/entities';

export interface UpdateTaskInput {
  id: string;
  data: Partial<Task>;
}

export class UpdateTaskUseCase {
  private taskRepository: ITaskRepository;

  constructor(taskRepository: ITaskRepository) {
    this.taskRepository = taskRepository;
  }

  async execute(input: UpdateTaskInput): Promise<Task> {
    const existingTask = await this.taskRepository.findById(input.id);

    if (!existingTask) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    return await this.taskRepository.update(input.id, input.data);
  }
}
