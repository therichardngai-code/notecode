import type { IAgentRepository } from '../domain/ports/repositories';
import type { Agent, AgentType, ToolConfig } from '../domain/entities';

export interface CreateAgentInput {
  projectId?: string;
  name: string;
  role: AgentType;
  description?: string;
  focusAreas?: string[];
  defaultSkills?: string[];
  defaultTools?: ToolConfig;
  injectPreviousSummaries?: boolean;
  maxSummariesToInject?: number;
}

export class CreateAgentUseCase {
  private agentRepository: IAgentRepository;

  constructor(agentRepository: IAgentRepository) {
    this.agentRepository = agentRepository;
  }

  async execute(input: CreateAgentInput): Promise<Agent> {
    const existingAgent = await this.agentRepository.findByName(
      input.name,
      input.projectId
    );

    if (existingAgent) {
      throw new Error(`Agent with name "${input.name}" already exists`);
    }

    const agentData = {
      projectId: input.projectId,
      name: input.name,
      role: input.role,
      description: input.description || '',
      focusAreas: input.focusAreas || [],
      defaultSkills: input.defaultSkills || [],
      defaultTools: input.defaultTools || {
        mode: 'allowlist' as const,
        tools: [],
      },
      injectPreviousSummaries: input.injectPreviousSummaries ?? true,
      maxSummariesToInject: input.maxSummariesToInject ?? 5,
      totalSessions: 0,
      totalTokensUsed: 0,
    };

    return await this.agentRepository.create(agentData);
  }
}
