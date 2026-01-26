/**
 * Memory Injection Service
 * Retrieves and formats relevant memories for session context
 */

import { IMemoryRepository } from '../../domain/ports/repositories/memory.repository.port.js';
import { IAgentSummaryRepository } from '../../domain/ports/repositories/agent-summary.repository.port.js';
import { CrossSessionMemory } from '../../domain/entities/memory.entity.js';
import { ExtractedAgentSummary } from '../../domain/entities/agent-summary.entity.js';

export interface InjectionContext {
  projectId: string;
  agentId?: string;
  prompt: string;
  maxMemories?: number;
  maxSummaries?: number;
}

export interface InjectionResult {
  injectedPrompt: string;
  memoriesUsed: number;
  summariesUsed: number;
}

export class MemoryInjectionService {
  constructor(
    private memoryRepo: IMemoryRepository | null,
    private agentSummaryRepo: IAgentSummaryRepository
  ) {}

  /**
   * Inject relevant memories into system prompt
   * Returns modified prompt with context prepended
   */
  async injectIntoPrompt(
    systemPrompt: string,
    context: InjectionContext
  ): Promise<InjectionResult> {
    const sections: string[] = [];
    let memoriesUsed = 0;
    let summariesUsed = 0;

    // 1. Inject agent summaries if agent is assigned
    if (context.agentId) {
      const summaries = await this.agentSummaryRepo.findByAgentId(
        context.agentId,
        context.maxSummaries ?? 5
      );

      if (summaries.length > 0) {
        sections.push(this.formatAgentSummaries(summaries));
        summariesUsed = summaries.length;
      }
    }

    // 2. Inject relevant cross-session memories via vector search (if enabled)
    if (this.memoryRepo) {
      try {
        const memories = await this.memoryRepo.searchSimilar(
          context.prompt,
          context.projectId,
          context.maxMemories ?? 5
        );

        if (memories.length > 0) {
          sections.push(this.formatMemories(memories));
          memoriesUsed = memories.length;
        }
      } catch (error) {
        // Memory search may fail if no embeddings exist yet
        console.warn('Memory search failed:', error);
      }
    }

    // Combine into system prompt
    if (sections.length === 0) {
      return {
        injectedPrompt: systemPrompt,
        memoriesUsed: 0,
        summariesUsed: 0,
      };
    }

    const contextSection = `## Relevant Context from Previous Sessions\n\n${sections.join('\n\n')}`;

    return {
      injectedPrompt: `${contextSection}\n\n---\n\n${systemPrompt}`,
      memoriesUsed,
      summariesUsed,
    };
  }

  /**
   * Get memories without injection (for preview/API)
   */
  async getRelevantMemories(
    projectId: string,
    prompt: string,
    limit: number = 10
  ): Promise<CrossSessionMemory[]> {
    if (!this.memoryRepo) {
      return [];
    }
    try {
      return await this.memoryRepo.searchSimilar(prompt, projectId, limit);
    } catch {
      return [];
    }
  }

  private formatAgentSummaries(summaries: ExtractedAgentSummary[]): string {
    const formatted = summaries
      .map((s, i) => {
        const files = s.filesModified.length > 0
          ? ` (files: ${s.filesModified.slice(0, 3).join(', ')})`
          : '';
        return `${i + 1}. [Session ${s.sessionId.slice(0, 8)}] ${s.summary}${files}`;
      })
      .join('\n');

    return `### Previous Sessions with this Agent\n${formatted}`;
  }

  private formatMemories(memories: CrossSessionMemory[]): string {
    const formatted = memories
      .map(m => `- **${m.category}**: ${m.summary}`)
      .join('\n');

    return `### Project Knowledge\n${formatted}`;
  }
}
