/**
 * Hook Repository Port
 * Interface for hook data access
 */

import { Hook, HookEvent } from '../../entities/hook.entity.js';

export interface HookQueryFilters {
  projectId?: string;
  taskId?: string;
  event?: HookEvent;
  enabled?: boolean;
}

export interface IHookRepository {
  findById(id: string): Promise<Hook | null>;
  findByProjectId(projectId: string): Promise<Hook[]>;
  findByTaskId(taskId: string): Promise<Hook[]>;
  findByEvent(event: HookEvent, projectId?: string, taskId?: string): Promise<Hook[]>;
  findEnabled(filters?: HookQueryFilters): Promise<Hook[]>;
  findAll(filters?: HookQueryFilters): Promise<Hook[]>;
  save(hook: Hook): Promise<Hook>;
  delete(id: string): Promise<boolean>;
  deleteByProjectId(projectId: string): Promise<number>;
  deleteByTaskId(taskId: string): Promise<number>;
}
