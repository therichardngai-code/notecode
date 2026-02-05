/**
 * Discovery API Client
 * Fetch available skills and agents from project/user folders (multi-provider support)
 */

import { apiClient } from './api-client';
import type { ProviderType } from './tasks-api';

// Re-export for convenience
export type { ProviderType };

// Provider folder mapping
export type ProviderFolder = 'claude' | 'gemini' | 'codex' | 'notecode';

/**
 * Discovered skill from .claude/skills/, .gemini/skills/, etc.
 */
export interface DiscoveredSkill {
  name: string;
  description: string;
  source: 'project' | 'user';
  path: string;
  providerFolder: ProviderFolder;
}

/**
 * Discovered agent from .claude/agents/, .gemini/agents/, etc.
 */
export interface DiscoveredAgent {
  name: string;
  description: string;
  model?: string;
  source: 'project' | 'user';
  path: string;
  providerFolder: ProviderFolder;
}

// API Response types
export interface SkillsResponse {
  provider: ProviderType;
  skills: DiscoveredSkill[];
}

export interface AgentsResponse {
  provider: ProviderType;
  agents: DiscoveredAgent[];
}

export interface RefreshResponse {
  success: boolean;
}

/**
 * Discovery API methods
 */
export const discoveryApi = {
  /**
   * Get available skills for a project
   * @param projectId - Project ID
   * @param provider - Optional provider override (defaults to settings.defaultProvider)
   */
  getSkills: (projectId: string, provider?: ProviderType) => {
    const params = provider ? { provider } : undefined;
    return apiClient.get<SkillsResponse>(`/api/projects/${projectId}/discovery/skills`, params);
  },

  /**
   * Get available agents for a project
   * @param projectId - Project ID
   * @param provider - Optional provider override (defaults to settings.defaultProvider)
   */
  getAgents: (projectId: string, provider?: ProviderType) => {
    const params = provider ? { provider } : undefined;
    return apiClient.get<AgentsResponse>(`/api/projects/${projectId}/discovery/agents`, params);
  },

  /**
   * Refresh discovery cache for a project (clears backend cache)
   * @param projectId - Project ID
   */
  refresh: (projectId: string) =>
    apiClient.post<RefreshResponse>(`/api/projects/${projectId}/discovery/refresh`),
};
