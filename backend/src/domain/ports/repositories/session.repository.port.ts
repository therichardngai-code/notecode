/**
 * Session Repository Port
 * Interface for session data access
 */

import { Session } from '../../entities/session.entity.js';
import { SessionStatus } from '../../value-objects/task-status.vo.js';

export interface SessionFilters {
  status?: SessionStatus[];
  taskId?: string;
  agentId?: string;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByTaskId(taskId: string): Promise<Session[]>;
  findByAgentId(agentId: string): Promise<Session[]>;
  findRunning(): Promise<Session[]>;
  findRecent(limit?: number): Promise<Session[]>;
  save(session: Session): Promise<Session>;
  delete(id: string): Promise<boolean>;
}
