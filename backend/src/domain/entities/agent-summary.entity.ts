/**
 * Agent Summary Entity
 * Stores extracted summaries from agent sessions
 */

export class ExtractedAgentSummary {
  constructor(
    public readonly id: string,
    public readonly agentId: string,
    public readonly sessionId: string,
    public readonly summary: string,
    public readonly keyDecisions: string[],
    public readonly filesModified: string[],
    public readonly tokenCount: number,
    public readonly extractedAt: Date,
    public readonly createdAt: Date
  ) {}
}
