import type { Artifact } from '../../entities';

export interface IArtifactRepository {
  findAll(sessionId: string): Promise<Artifact[]>;
  findById(id: string): Promise<Artifact | null>;
  create(artifact: Omit<Artifact, 'id' | 'createdAt'>): Promise<Artifact>;
  update(id: string, data: Partial<Artifact>): Promise<Artifact>;
  markApplied(id: string): Promise<Artifact>;
  delete(id: string): Promise<void>;
}
