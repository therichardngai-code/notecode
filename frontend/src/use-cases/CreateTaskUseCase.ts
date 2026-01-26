import type { ITaskRepository } from '../domain/ports/repositories';
import type { Task, TaskStatus, TaskPriority, AgentType, ProviderType } from '../domain/entities';

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: Date;
  agentRole: AgentType;
  provider: ProviderType;
  model: string;
  skills?: string[];
  contextFiles?: string[];
}

export class CreateTaskUseCase {
  private taskRepository: ITaskRepository;

  constructor(taskRepository: ITaskRepository) {
    this.taskRepository = taskRepository;
  }

  async execute(input: CreateTaskInput): Promise<Task> {
    const taskData = {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status || 'not-started' as TaskStatus,
      priority: input.priority || 'medium' as TaskPriority,
      assignee: input.assignee,
      dueDate: input.dueDate,
      agentRole: input.agentRole,
      provider: input.provider,
      model: input.model,
      skills: input.skills || [],
      tools: {
        mode: 'allowlist' as const,
        tools: [],
      },
      contextFiles: input.contextFiles || [],
    };

    return await this.taskRepository.create(taskData);
  }
}
