export type UserMemoryType = 'rule' | 'guide' | 'preference' | 'context';

export interface UserMemory {
  id: string;
  projectId?: string;
  type: UserMemoryType;
  title: string;
  content: string;
  injectOnSessionStart: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrossSessionMemory {
  id: string;
  sessionId: string;
  projectId: string;
  category: string;
  summary: string;
  keywords: string;
  vector: number[];
  timestamp: string;
}
