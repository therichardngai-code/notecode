export interface Project {
  id: string;
  name: string;
  path: string;
  isFavorite: boolean;
  lastAccessedAt: Date;
  createdAt: Date;
}
