import type { Agent, AgentSummary } from '../../entities';

export interface IAgentRepository {
  findAll(): Promise<Agent[]>;
  findById(id: string): Promise<Agent | null>;
  findByName(name: string, projectId?: string): Promise<Agent | null>;
  findByProject(projectId: string): Promise<Agent[]>;
  create(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent>;
  update(id: string, data: Partial<Agent>): Promise<Agent>;
  delete(id: string): Promise<void>;
  getSummaries(agentId: string, limit?: number): Promise<AgentSummary[]>;
  createSummary(summary: Omit<AgentSummary, 'id' | 'createdAt'>): Promise<AgentSummary>;
}
