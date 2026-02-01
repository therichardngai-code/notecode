/**
 * Analytics Controller
 * Token usage and session analytics endpoints with caching
 */

import type { FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../../infrastructure/database/connection.js';
import { sessions, tasks } from '../../infrastructure/database/schema.js';
import { eq, sql, desc, gte, and } from 'drizzle-orm';

// Simple in-memory cache (5-minute TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// Helper: Fill missing days in 7-day range
function fillMissingDays(data: { day: string; tokens: number; sessions: number; cost: number }[]) {
  const result = [];
  const dataMap = new Map(data.map(d => [d.day, d]));

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    const existing = dataMap.get(dayStr);
    result.push({
      day: dayStr,
      dayName,
      tokens: existing?.tokens ?? 0,
      sessions: existing?.sessions ?? 0,
      cost: Number((existing?.cost ?? 0).toFixed(4)),
    });
  }
  return result;
}

// Helper: Aggregate model usage from JSON
function aggregateModelUsage(data: { provider: string | null; modelUsage: string | null; sessionCount: number; tokens: number; cost: number }[]) {
  const models: Record<string, { sessions: number; inputTokens: number; outputTokens: number; cost: number }> = {};

  for (const row of data) {
    const provider = row.provider || 'unknown';

    if (row.modelUsage) {
      try {
        const usage = JSON.parse(row.modelUsage);
        if (Array.isArray(usage)) {
          for (const m of usage) {
            const key = m.model || provider;
            if (!models[key]) models[key] = { sessions: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
            models[key].inputTokens += m.inputTokens || 0;
            models[key].outputTokens += m.outputTokens || 0;
            models[key].cost += m.costUsd || 0;
            models[key].sessions += 1;
          }
          continue;
        }
      } catch { /* ignore */ }
    }

    // Fallback: no modelUsage JSON, use provider-level data
    if (!models[provider]) models[provider] = { sessions: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    models[provider].sessions += row.sessionCount;
    models[provider].inputTokens += row.tokens; // tokenTotal as fallback
    models[provider].cost += row.cost;
  }

  return Object.entries(models).map(([model, stats]) => ({
    model,
    sessions: stats.sessions,
    inputTokens: stats.inputTokens,
    outputTokens: stats.outputTokens,
    totalTokens: stats.inputTokens + stats.outputTokens,
    cost: Number(stats.cost.toFixed(4)),
  }));
}

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDatabase();

  /**
   * GET /api/analytics/overview
   */
  fastify.get<{ Querystring: { projectId?: string } }>(
    '/analytics/overview',
    async (request, reply) => {
      const { projectId } = request.query;
      const cacheKey = `overview:${projectId || 'global'}`;

      const cached = getCached(cacheKey);
      if (cached) return reply.send(cached);

      const result = await db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${sessions.tokenTotal}), 0)`,
          totalSessions: sql<number>`COUNT(*)`,
          avgResponseTimeMs: sql<number>`COALESCE(AVG(${sessions.durationMs}), 0)`,
          totalCostUsd: sql<number>`COALESCE(SUM(${sessions.estimatedCostUsd}), 0)`,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(projectId
          ? and(eq(sessions.status, 'completed'), eq(tasks.projectId, projectId))
          : eq(sessions.status, 'completed')
        );

      const data = {
        totalTokens: result[0]?.totalTokens ?? 0,
        totalSessions: result[0]?.totalSessions ?? 0,
        avgResponseTimeMs: Math.round(result[0]?.avgResponseTimeMs ?? 0),
        totalCostUsd: Number((result[0]?.totalCostUsd ?? 0).toFixed(4)),
      };

      setCache(cacheKey, data);
      return reply.send(data);
    }
  );

  /**
   * GET /api/analytics/daily-usage
   */
  fastify.get<{ Querystring: { projectId?: string } }>(
    '/analytics/daily-usage',
    async (request, reply) => {
      const { projectId } = request.query;
      const cacheKey = `daily:${projectId || 'global'}`;

      const cached = getCached(cacheKey);
      if (cached) return reply.send(cached);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const baseCondition = gte(sessions.startedAt, sevenDaysAgo.toISOString());

      const result = await db
        .select({
          day: sql<string>`date(${sessions.startedAt})`,
          tokens: sql<number>`COALESCE(SUM(${sessions.tokenTotal}), 0)`,
          sessions: sql<number>`COUNT(*)`,
          cost: sql<number>`COALESCE(SUM(${sessions.estimatedCostUsd}), 0)`,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(projectId ? and(baseCondition, eq(tasks.projectId, projectId)) : baseCondition)
        .groupBy(sql`date(${sessions.startedAt})`)
        .orderBy(sql`date(${sessions.startedAt})`);

      const data = fillMissingDays(result);
      setCache(cacheKey, data);
      return reply.send(data);
    }
  );

  /**
   * GET /api/analytics/model-distribution
   */
  fastify.get<{ Querystring: { projectId?: string } }>(
    '/analytics/model-distribution',
    async (request, reply) => {
      const { projectId } = request.query;
      const cacheKey = `models:${projectId || 'global'}`;

      const cached = getCached(cacheKey);
      if (cached) return reply.send(cached);

      const result = await db
        .select({
          provider: sessions.provider,
          modelUsage: sessions.modelUsage,
          sessionCount: sql<number>`COUNT(*)`,
          tokens: sql<number>`COALESCE(SUM(${sessions.tokenTotal}), 0)`,
          cost: sql<number>`COALESCE(SUM(${sessions.estimatedCostUsd}), 0)`,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(projectId ? eq(tasks.projectId, projectId) : undefined)
        .groupBy(sessions.provider);

      const data = aggregateModelUsage(result);
      setCache(cacheKey, data);
      return reply.send(data);
    }
  );

  /**
   * GET /api/analytics/recent-activity
   * Groups by providerSessionId to show one row per CLI conversation
   */
  fastify.get<{ Querystring: { projectId?: string; limit?: string } }>(
    '/analytics/recent-activity',
    async (request, reply) => {
      const { projectId, limit: limitStr } = request.query;
      const limit = parseInt(limitStr || '10', 10);
      const cacheKey = `recent:${projectId || 'global'}:${limit}`;

      const cached = getCached(cacheKey);
      if (cached) return reply.send(cached);

      // Group by providerSessionId to merge internal sessions into one conversation
      const result = await db
        .select({
          providerSessionId: sessions.providerSessionId,
          startedAt: sql<string>`MIN(${sessions.startedAt})`,
          endedAt: sql<string>`MAX(${sessions.endedAt})`,
          tokenTotal: sql<number>`COALESCE(SUM(${sessions.tokenTotal}), 0)`,
          provider: sessions.provider,
          sessionCount: sql<number>`COUNT(*)`,
          durationMs: sql<number>`COALESCE(SUM(${sessions.durationMs}), 0)`,
          costUsd: sql<number>`COALESCE(SUM(${sessions.estimatedCostUsd}), 0)`,
          taskId: tasks.id,
          taskTitle: tasks.title,
          projectId: tasks.projectId,
        })
        .from(sessions)
        .leftJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(projectId ? eq(tasks.projectId, projectId) : undefined)
        .groupBy(sessions.providerSessionId, sessions.provider, tasks.id, tasks.title, tasks.projectId)
        .orderBy(desc(sql`MAX(${sessions.startedAt})`))
        .limit(limit);

      setCache(cacheKey, result);
      return reply.send(result);
    }
  );
};
