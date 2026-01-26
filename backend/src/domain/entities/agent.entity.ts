/**
 * Agent Entity
 * Represents a persistent AI agent identity with configuration
 */

import { AgentRole } from '../value-objects/task-status.vo.js';

export interface AgentToolConfig {
  mode: 'allowlist' | 'blocklist';
  tools: string[];
}

export interface AgentSummary {
  sessionId: string;
  summary: string;
  createdAt: Date;
}

export class Agent {
  constructor(
    public readonly id: string,
    public projectId: string | null,
    public name: string,
    public role: AgentRole,
    public description: string | null,
    public focusAreas: string[],
    public defaultSkills: string[],
    public defaultTools: AgentToolConfig | null,
    public injectPreviousSummaries: boolean,
    public maxSummariesToInject: number,
    public totalSessions: number,
    public totalTokensUsed: number,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  updateName(name: string): void {
    if (!name.trim()) {
      throw new Error('Agent name cannot be empty');
    }
    this.name = name.trim();
    this.updatedAt = new Date();
  }

  updateDescription(description: string | null): void {
    this.description = description?.trim() ?? null;
    this.updatedAt = new Date();
  }

  updateRole(role: AgentRole): void {
    this.role = role;
    this.updatedAt = new Date();
  }

  setFocusAreas(areas: string[]): void {
    this.focusAreas = areas.filter(a => a.trim());
    this.updatedAt = new Date();
  }

  setDefaultSkills(skills: string[]): void {
    this.defaultSkills = skills.filter(s => s.trim());
    this.updatedAt = new Date();
  }

  setDefaultTools(config: AgentToolConfig | null): void {
    this.defaultTools = config;
    this.updatedAt = new Date();
  }

  enableSummaryInjection(maxSummaries: number = 5): void {
    this.injectPreviousSummaries = true;
    this.maxSummariesToInject = maxSummaries;
    this.updatedAt = new Date();
  }

  disableSummaryInjection(): void {
    this.injectPreviousSummaries = false;
    this.updatedAt = new Date();
  }

  recordSessionCompletion(tokensUsed: number): void {
    this.totalSessions++;
    this.totalTokensUsed += tokensUsed;
    this.updatedAt = new Date();
  }
}
