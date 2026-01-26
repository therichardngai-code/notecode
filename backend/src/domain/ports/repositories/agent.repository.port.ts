/**
 * Agent Repository Port
 * Interface for agent data access
 */

import { Agent, AgentSummary } from '../../entities/agent.entity.js';
import { AgentRole } from '../../value-objects/task-status.vo.js';

export interface AgentFilters {
  projectId?: string;
  role?: AgentRole;
  search?: string;
}

export interface IAgentRepository {
  findById(id: string): Promise<Agent | null>;
  findByProjectId(projectId: string): Promise<Agent[]>;
  findAll(filters?: AgentFilters): Promise<Agent[]>;
  save(agent: Agent): Promise<Agent>;
  delete(id: string): Promise<boolean>;
  getSummaries(agentId: string, limit?: number): Promise<AgentSummary[]>;
  saveSummary(agentId: string, sessionId: string, summary: string): Promise<void>;
}
