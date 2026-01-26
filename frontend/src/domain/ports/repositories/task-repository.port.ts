import type { Task, TaskStatus } from '../../entities';

export interface TaskFilters {
  projectId?: string;
  status?: TaskStatus;
  agentId?: string;
  priority?: string;
  assignee?: string;
}

export interface ITaskRepository {
  findAll(filters?: TaskFilters): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  findByProject(projectId: string): Promise<Task[]>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: TaskStatus): Promise<Task>;
}
