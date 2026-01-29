/**
 * Task Repository Port
 * Interface for task data access
 */

import { Task } from '../../entities/task.entity.js';
import { TaskStatus, TaskPriority } from '../../value-objects/task-status.vo.js';

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
  agentId?: string;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filters?: TaskFilters): Promise<Task[]>;
  findByProjectId(projectId: string, filters?: TaskFilters): Promise<Task[]>;
  findByAgentId(agentId: string): Promise<Task[]>;
  save(task: Task): Promise<Task>;
  delete(id: string): Promise<boolean>;
  countByStatus(projectId: string): Promise<Record<TaskStatus, number>>;
}
