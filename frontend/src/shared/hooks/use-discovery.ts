/**
 * Discovery Hooks
 * React Query hooks for skills and agents discovery (multi-provider support)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  discoveryApi,
  type DiscoveredSkill,
  type DiscoveredAgent,
  type ProviderType,
} from '@/adapters/api/discovery-api';

// Query keys include provider for proper cache separation
export const discoveryKeys = {
  all: ['discovery'] as const,
  skills: (projectId: string, provider?: ProviderType) =>
    [...discoveryKeys.all, 'skills', projectId, provider ?? 'default'] as const,
  agents: (projectId: string, provider?: ProviderType) =>
    [...discoveryKeys.all, 'agents', projectId, provider ?? 'default'] as const,
};

interface DiscoveryOptions {
  projectId: string | undefined;
  provider?: ProviderType;
}

/**
 * Hook to fetch available skills for a project
 * @param options.projectId - Project ID (required to enable query)
 * @param options.provider - Optional provider (anthropic, google, openai)
 */
export function useDiscoveredSkills({ projectId, provider }: DiscoveryOptions) {
  return useQuery({
    queryKey: discoveryKeys.skills(projectId ?? '', provider),
    queryFn: () => discoveryApi.getSkills(projectId!, provider),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.skills,
  });
}

/**
 * Hook to fetch available agents for a project
 * @param options.projectId - Project ID (required to enable query)
 * @param options.provider - Optional provider (anthropic, google, openai)
 */
export function useDiscoveredAgents({ projectId, provider }: DiscoveryOptions) {
  return useQuery({
    queryKey: discoveryKeys.agents(projectId ?? '', provider),
    queryFn: () => discoveryApi.getAgents(projectId!, provider),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.agents,
  });
}

/**
 * Hook to fetch both skills and agents in parallel
 * @param options.projectId - Project ID (required to enable queries)
 * @param options.provider - Optional provider (anthropic, google, openai)
 */
export function useDiscovery({ projectId, provider }: DiscoveryOptions): {
  skills: DiscoveredSkill[];
  agents: DiscoveredAgent[];
  isLoading: boolean;
  error: Error | null;
} {
  const skillsQuery = useDiscoveredSkills({ projectId, provider });
  const agentsQuery = useDiscoveredAgents({ projectId, provider });

  return {
    skills: skillsQuery.data ?? [],
    agents: agentsQuery.data ?? [],
    isLoading: skillsQuery.isLoading || agentsQuery.isLoading,
    error: skillsQuery.error || agentsQuery.error,
  };
}

/**
 * Hook to refresh discovery cache (clears all provider caches for project)
 * Returns a function to trigger refresh
 */
export function useRefreshDiscovery() {
  const queryClient = useQueryClient();

  return async (projectId: string) => {
    // Call backend to clear server-side cache
    await discoveryApi.refresh(projectId);

    // Invalidate all discovery queries for this project (all providers)
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key[0] === 'discovery' &&
          (key[1] === 'skills' || key[1] === 'agents') &&
          key[2] === projectId
        );
      },
    });
  };
}
