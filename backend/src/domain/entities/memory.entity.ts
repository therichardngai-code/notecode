/**
 * Cross-Session Memory Entity
 * Represents extracted knowledge from sessions stored in vector DB
 */

export interface CrossSessionMemory {
  id: string;
  sessionId: string;
  projectId: string;
  category: 'pattern' | 'convention' | 'gotcha' | 'decision' | 'init';
  summary: string;
  keywords: string;
  vector: number[];
  timestamp: string;
}

export interface MemorySearchResult extends CrossSessionMemory {
  score: number;
}
