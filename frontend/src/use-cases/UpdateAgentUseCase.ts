import type { IAgentRepository } from '../domain/ports/repositories';
import type { Agent, AgentType, ToolConfig } from '../domain/entities';

export interface UpdateAgentInput {
  name?: string;
  role?: AgentType;
  description?: string;
  focusAreas?: string[];
  defaultSkills?: string[];
  defaultTools?: ToolConfig;
  injectPreviousSummaries?: boolean;
  maxSummariesToInject?: number;
}

export class UpdateAgentUseCase {
  private agentRepository: IAgentRepository;

  constructor(agentRepository: IAgentRepository) {
    this.agentRepository = agentRepository;
  }

  async execute(id: string, input: UpdateAgentInput): Promise<Agent> {
    const agent = await this.agentRepository.findById(id);
    if (!agent) {
      throw new Error(`Agent with id "${id}" not found`);
    }

    if (input.name && input.name !== agent.name) {
      const existingAgent = await this.agentRepository.findByName(
        input.name,
        agent.projectId
      );
      if (existingAgent) {
        throw new Error(`Agent with name "${input.name}" already exists`);
      }
    }

    return await this.agentRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.agentRepository.delete(id);
  }

  async getAll(): Promise<Agent[]> {
    return await this.agentRepository.findAll();
  }

  async getById(id: string): Promise<Agent | null> {
    return await this.agentRepository.findById(id);
  }
}
