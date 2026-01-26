import type { Project } from '../../entities';

export interface IProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findByPath(path: string): Promise<Project | null>;
  create(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
  update(id: string, data: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<Project>;
  updateLastAccessed(id: string): Promise<void>;
}
