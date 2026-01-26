export type ArtifactType = 'file-create' | 'file-edit' | 'file-delete';

export interface Artifact {
  id: string;
  sessionId: string;
  type: ArtifactType;
  filePath: string;
  originalContent?: string;
  newContent: string;
  applied: boolean;
  appliedAt?: Date;
  createdAt: Date;
}
