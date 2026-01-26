/**
 * Extract Memory Use Case
 * Triggers memory extraction from a completed session
 */

import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { SummaryExtractionService } from '../../adapters/services/summary-extraction.service.js';

export interface ExtractMemoryRequest {
  sessionId: string;
}

export interface ExtractMemoryResponse {
  success: boolean;
  memoriesCreated: number;
  agentSummaryCreated: boolean;
  error?: string;
}

export class ExtractMemoryUseCase {
  constructor(
    private sessionRepo: ISessionRepository,
    private taskRepo: ITaskRepository,
    private extractionService: SummaryExtractionService
  ) {}

  async execute(request: ExtractMemoryRequest): Promise<ExtractMemoryResponse> {
    const session = await this.sessionRepo.findById(request.sessionId);
    if (!session) {
      return {
        success: false,
        memoriesCreated: 0,
        agentSummaryCreated: false,
        error: 'Session not found',
      };
    }

    // Get project from task
    const task = session.taskId
      ? await this.taskRepo.findById(session.taskId)
      : null;

    if (!task) {
      return {
        success: false,
        memoriesCreated: 0,
        agentSummaryCreated: false,
        error: 'No task associated with session',
      };
    }

    try {
      const result = await this.extractionService.extractFromSession(
        session.id,
        session.agentId ?? null,
        task.projectId
      );

      return {
        success: true,
        memoriesCreated: result.memories.length,
        agentSummaryCreated: !!result.agentSummary,
      };
    } catch (error) {
      return {
        success: false,
        memoriesCreated: 0,
        agentSummaryCreated: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      };
    }
  }
}
