/**
 * Agent Summary Repository Port
 * Interface for agent summary storage operations
 */

import { ExtractedAgentSummary } from '../../entities/agent-summary.entity.js';

export interface IAgentSummaryRepository {
  /** Find summaries by agent ID (most recent first) */
  findByAgentId(agentId: string, limit?: number): Promise<ExtractedAgentSummary[]>;

  /** Save agent summary */
  save(summary: ExtractedAgentSummary): Promise<ExtractedAgentSummary>;

  /** Delete summary by ID */
  delete(id: string): Promise<boolean>;
}
