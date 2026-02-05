/**
 * Discovery Controller
 * API endpoints for discovering available skills and agents from project/user folders.
 * Supports multiple CLI providers: Claude, Gemini, Codex
 */

import type { FastifyPluginAsync } from 'fastify';
import { DiscoveryService } from '../../domain/services/discovery.service.js';
import { SqliteProjectRepository } from '../repositories/sqlite-project.repository.js';
import { SqliteSettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { ProviderType } from '../../domain/value-objects/task-status.vo.js';

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const CACHE_TTL = 30 * 1000; // 30 seconds
const skillsCache = new Map<string, CacheEntry<unknown>>();
const agentsCache = new Map<string, CacheEntry<unknown>>();

/**
 * Build cache key from projectId and provider
 */
function cacheKey(projectId: string, provider: string): string {
  return `${projectId}:${provider}`;
}

/**
 * Parse provider query param to ProviderType enum
 */
function parseProvider(providerParam: string | undefined, defaultProvider: string): ProviderType {
  const providerMap: Record<string, ProviderType> = {
    anthropic: ProviderType.ANTHROPIC,
    google: ProviderType.GOOGLE,
    openai: ProviderType.OPENAI,
  };
  return providerMap[providerParam ?? defaultProvider] ?? ProviderType.ANTHROPIC;
}

export const discoveryRoutes: FastifyPluginAsync = async (fastify) => {
  const projectRepo = new SqliteProjectRepository();
  const settingsRepo = new SqliteSettingsRepository();
  const discoveryService = new DiscoveryService();

  /**
   * GET /api/projects/:projectId/discovery/skills
   * Discover available skills for a project
   *
   * Query params:
   * - provider: anthropic | google | openai (defaults to settings.defaultProvider)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { provider?: string };
  }>(
    '/projects/:projectId/discovery/skills',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['anthropic', 'google', 'openai'] }
          }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { provider: providerParam } = request.query;

      // Get default provider from settings
      const settings = await settingsRepo.getGlobal();
      const provider = parseProvider(providerParam, settings.defaultProvider ?? 'anthropic');
      const providerName = providerParam ?? settings.defaultProvider ?? 'anthropic';

      // Check cache
      const key = cacheKey(projectId, providerName);
      const cached = skillsCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return reply.send(cached.data);
      }

      // Validate project exists
      const project = await projectRepo.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Discover skills
      const skills = discoveryService.discoverSkills(project.path, provider);
      const response = { provider: providerName, skills };

      // Cache response
      skillsCache.set(key, { data: response, expires: Date.now() + CACHE_TTL });

      return reply.send(response);
    }
  );

  /**
   * GET /api/projects/:projectId/discovery/agents
   * Discover available agents for a project
   *
   * Query params:
   * - provider: anthropic | google | openai (defaults to settings.defaultProvider)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { provider?: string };
  }>(
    '/projects/:projectId/discovery/agents',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['anthropic', 'google', 'openai'] }
          }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { provider: providerParam } = request.query;

      // Get default provider from settings
      const settings = await settingsRepo.getGlobal();
      const provider = parseProvider(providerParam, settings.defaultProvider ?? 'anthropic');
      const providerName = providerParam ?? settings.defaultProvider ?? 'anthropic';

      // Check cache
      const key = cacheKey(projectId, providerName);
      const cached = agentsCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return reply.send(cached.data);
      }

      // Validate project exists
      const project = await projectRepo.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Discover agents
      const agents = discoveryService.discoverAgents(project.path, provider);
      const response = { provider: providerName, agents };

      // Cache response
      agentsCache.set(key, { data: response, expires: Date.now() + CACHE_TTL });

      return reply.send(response);
    }
  );

  /**
   * POST /api/projects/:projectId/discovery/refresh
   * Clear discovery cache for a project (all providers)
   */
  fastify.post<{
    Params: { projectId: string };
  }>(
    '/projects/:projectId/discovery/refresh',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;

      // Clear all provider caches for this project
      for (const provider of ['anthropic', 'google', 'openai']) {
        const key = cacheKey(projectId, provider);
        skillsCache.delete(key);
        agentsCache.delete(key);
      }

      return reply.send({ success: true });
    }
  );
};
