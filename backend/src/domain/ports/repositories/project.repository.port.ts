/**
 * Project Repository Port
 * Interface for project data access
 */

import { Project } from '../../entities/project.entity.js';

export interface ProjectFilters {
  isFavorite?: boolean;
  search?: string;
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByPath(path: string): Promise<Project | null>;
  findAll(filters?: ProjectFilters): Promise<Project[]>;
  findRecent(limit?: number): Promise<Project[]>;
  findFavorites(): Promise<Project[]>;
  save(project: Project): Promise<Project>;
  delete(id: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
}
