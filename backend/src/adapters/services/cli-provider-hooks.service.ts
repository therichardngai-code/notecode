/**
 * CLI Provider Hooks Service
 * Manages hooks and settings for CLI providers (Claude, Gemini, Codex, etc.)
 * Handles CRUD operations and filesystem sync
 */

import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDatabase } from '../../infrastructure/database/connection.js';
import { cliProviderHooks, cliProviderSettings, projects } from '../../infrastructure/database/schema.js';

// Supported CLI providers
export type CliProvider = 'claude' | 'gemini' | 'codex';

// Hook types per provider
export const PROVIDER_HOOK_TYPES: Record<CliProvider, string[]> = {
  claude: ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'],
  gemini: ['PreToolUse', 'PostToolUse', 'PrePrompt', 'PostPrompt'],
  codex: ['PreToolUse', 'PostToolUse', 'PreExec', 'PostExec'],
};

// Provider directory names
const PROVIDER_DIRS: Record<CliProvider, string> = {
  claude: '.claude',
  gemini: '.gemini',
  codex: '.codex',
};

export interface CliHook {
  id: string;
  projectId: string | null;
  provider: CliProvider;
  name: string;
  hookType: string;
  script: string;
  enabled: boolean;
  scope: 'project' | 'global';
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CliSettings {
  id: string;
  projectId: string | null;
  provider: CliProvider;
  settings: Record<string, unknown>;
  scope: 'project' | 'global';
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHookInput {
  projectId?: string;
  provider: CliProvider;
  name: string;
  hookType: string;
  script: string;
  enabled?: boolean;
  scope?: 'project' | 'global';
}

export interface UpdateHookInput {
  name?: string;
  hookType?: string;
  script?: string;
  enabled?: boolean;
}

export class CliProviderHooksService {
  /**
   * Get hooks directory path for a provider
   */
  private getHooksDir(provider: CliProvider, projectPath?: string): string {
    const baseDir = projectPath ?? homedir();
    return join(baseDir, PROVIDER_DIRS[provider], 'hooks');
  }

  /**
   * Get settings file path for a provider
   */
  private getSettingsPath(provider: CliProvider, projectPath?: string): string {
    const baseDir = projectPath ?? homedir();
    return join(baseDir, PROVIDER_DIRS[provider], 'settings.json');
  }

  // ============ HOOKS CRUD ============

  /**
   * Create a new CLI hook
   */
  async createHook(input: CreateHookInput): Promise<CliHook> {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    // Validate hook type for provider
    const validTypes = PROVIDER_HOOK_TYPES[input.provider];
    if (!validTypes.includes(input.hookType)) {
      throw new Error(`Invalid hook type '${input.hookType}' for provider '${input.provider}'. Valid: ${validTypes.join(', ')}`);
    }

    await db.insert(cliProviderHooks).values({
      id,
      projectId: input.projectId ?? null,
      provider: input.provider,
      name: input.name,
      hookType: input.hookType,
      script: input.script,
      enabled: input.enabled ?? true,
      scope: input.scope ?? 'project',
      createdAt: now,
      updatedAt: now,
    });

    return this.getHookById(id) as Promise<CliHook>;
  }

  /**
   * Get hook by ID
   */
  async getHookById(id: string): Promise<CliHook | null> {
    const db = getDatabase();
    const rows = await db.select().from(cliProviderHooks).where(eq(cliProviderHooks.id, id));
    return rows[0] ? this.mapHookRow(rows[0]) : null;
  }

  /**
   * List hooks with filters
   */
  async listHooks(filters?: {
    projectId?: string | null;
    provider?: CliProvider;
    scope?: 'project' | 'global';
    enabled?: boolean;
  }): Promise<CliHook[]> {
    const db = getDatabase();
    let query = db.select().from(cliProviderHooks);

    // Build conditions
    const conditions = [];
    if (filters?.projectId !== undefined) {
      conditions.push(filters.projectId === null
        ? isNull(cliProviderHooks.projectId)
        : eq(cliProviderHooks.projectId, filters.projectId));
    }
    if (filters?.provider) {
      conditions.push(eq(cliProviderHooks.provider, filters.provider));
    }
    if (filters?.scope) {
      conditions.push(eq(cliProviderHooks.scope, filters.scope));
    }
    if (filters?.enabled !== undefined) {
      conditions.push(eq(cliProviderHooks.enabled, filters.enabled));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = await query;
    return rows.map(r => this.mapHookRow(r));
  }

  /**
   * Update a hook
   */
  async updateHook(id: string, input: UpdateHookInput): Promise<CliHook | null> {
    const db = getDatabase();
    const existing = await this.getHookById(id);
    if (!existing) return null;

    // Validate hook type if changing
    if (input.hookType) {
      const validTypes = PROVIDER_HOOK_TYPES[existing.provider];
      if (!validTypes.includes(input.hookType)) {
        throw new Error(`Invalid hook type '${input.hookType}' for provider '${existing.provider}'`);
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.hookType !== undefined) updates.hookType = input.hookType;
    if (input.script !== undefined) updates.script = input.script;
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    await db.update(cliProviderHooks).set(updates).where(eq(cliProviderHooks.id, id));
    return this.getHookById(id);
  }

  /**
   * Delete a hook
   */
  async deleteHook(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(cliProviderHooks).where(eq(cliProviderHooks.id, id));
    return (result.changes ?? 0) > 0;
  }

  // ============ SETTINGS CRUD ============

  /**
   * Get or create settings for a provider/project
   */
  async getSettings(provider: CliProvider, projectId?: string): Promise<CliSettings | null> {
    const db = getDatabase();
    const conditions = [eq(cliProviderSettings.provider, provider)];

    if (projectId) {
      conditions.push(eq(cliProviderSettings.projectId, projectId));
    } else {
      conditions.push(isNull(cliProviderSettings.projectId));
    }

    const rows = await db.select().from(cliProviderSettings).where(and(...conditions));
    return rows[0] ? this.mapSettingsRow(rows[0]) : null;
  }

  /**
   * Save settings for a provider/project
   */
  async saveSettings(
    provider: CliProvider,
    settings: Record<string, unknown>,
    projectId?: string
  ): Promise<CliSettings> {
    const db = getDatabase();
    const existing = await this.getSettings(provider, projectId);
    const now = new Date().toISOString();

    if (existing) {
      await db.update(cliProviderSettings)
        .set({ settings: JSON.stringify(settings), updatedAt: now })
        .where(eq(cliProviderSettings.id, existing.id));
      return this.getSettings(provider, projectId) as Promise<CliSettings>;
    }

    const id = randomUUID();
    await db.insert(cliProviderSettings).values({
      id,
      projectId: projectId ?? null,
      provider,
      settings: JSON.stringify(settings),
      scope: projectId ? 'project' : 'global',
      createdAt: now,
      updatedAt: now,
    });

    return this.getSettings(provider, projectId) as Promise<CliSettings>;
  }

  // ============ FILESYSTEM SYNC ============

  /**
   * Sync a hook to filesystem
   */
  async syncHookToFilesystem(hookId: string): Promise<void> {
    const hook = await this.getHookById(hookId);
    if (!hook) throw new Error('Hook not found');

    // Get project path if project-scoped
    let projectPath: string | undefined;
    if (hook.projectId) {
      const db = getDatabase();
      const rows = await db.select().from(projects).where(eq(projects.id, hook.projectId));
      projectPath = rows[0]?.path;
      if (!projectPath) throw new Error('Project not found');
    }

    const hooksDir = this.getHooksDir(hook.provider, hook.scope === 'global' ? undefined : projectPath);

    // Ensure directory exists
    if (!existsSync(hooksDir)) {
      await mkdir(hooksDir, { recursive: true });
    }

    // Write hook file
    const filePath = join(hooksDir, `${hook.name}.cjs`);
    await writeFile(filePath, hook.script, 'utf-8');

    // Update syncedAt
    const db = getDatabase();
    await db.update(cliProviderHooks)
      .set({ syncedAt: new Date().toISOString() })
      .where(eq(cliProviderHooks.id, hookId));
  }

  /**
   * Sync settings to filesystem
   */
  async syncSettingsToFilesystem(provider: CliProvider, projectId?: string): Promise<void> {
    const settings = await this.getSettings(provider, projectId);
    if (!settings) throw new Error('Settings not found');

    // Get project path if project-scoped
    let projectPath: string | undefined;
    if (projectId) {
      const db = getDatabase();
      const rows = await db.select().from(projects).where(eq(projects.id, projectId));
      projectPath = rows[0]?.path;
      if (!projectPath) throw new Error('Project not found');
    }

    const settingsPath = this.getSettingsPath(provider, settings.scope === 'global' ? undefined : projectPath);

    // Ensure directory exists
    const dir = join(settingsPath, '..');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Write settings file
    await writeFile(settingsPath, JSON.stringify(settings.settings, null, 2), 'utf-8');

    // Update syncedAt
    const db = getDatabase();
    await db.update(cliProviderSettings)
      .set({ syncedAt: new Date().toISOString() })
      .where(eq(cliProviderSettings.id, settings.id));
  }

  /**
   * Sync all hooks for a project to filesystem
   */
  async syncAllHooksToFilesystem(projectId?: string): Promise<number> {
    const hooks = await this.listHooks({ projectId: projectId ?? null, enabled: true });
    let synced = 0;
    for (const hook of hooks) {
      try {
        await this.syncHookToFilesystem(hook.id);
        synced++;
      } catch (error) {
        console.error(`Failed to sync hook ${hook.id}:`, error);
      }
    }
    return synced;
  }

  /**
   * Remove hook file from filesystem
   */
  async removeHookFromFilesystem(hook: CliHook, projectPath?: string): Promise<void> {
    const hooksDir = this.getHooksDir(hook.provider, hook.scope === 'global' ? undefined : projectPath);
    const filePath = join(hooksDir, `${hook.name}.cjs`);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // ============ TEMPLATES ============

  /**
   * Get available hook templates
   */
  getHookTemplates(provider: CliProvider): Array<{ name: string; hookType: string; description: string; script: string }> {
    if (provider === 'claude') {
      return [
        {
          name: 'approval-gate',
          hookType: 'PreToolUse',
          description: 'Requires approval for dangerous tools',
          script: this.getApprovalGateTemplate(),
        },
        {
          name: 'logging',
          hookType: 'PostToolUse',
          description: 'Logs all tool executions',
          script: this.getLoggingTemplate(),
        },
      ];
    }
    // Add templates for other providers as needed
    return [];
  }

  private getApprovalGateTemplate(): string {
    return `/**
 * Approval Gate Hook - PreToolUse
 * Checks with backend for tool approval
 */
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.NOTECODE_BACKEND_URL || 'http://localhost:3001';
const SESSION_ID = process.env.NOTECODE_SESSION_ID;

async function checkApproval(toolName, toolInput) {
  // Your approval logic here
  return { approved: true };
}

module.exports = async ({ tool_name, tool_input }) => {
  const result = await checkApproval(tool_name, tool_input);
  if (!result.approved) {
    return { decision: 'block', reason: result.reason || 'Blocked by approval gate' };
  }
  return { decision: 'allow' };
};
`;
  }

  private getLoggingTemplate(): string {
    return `/**
 * Logging Hook - PostToolUse
 * Logs tool execution results
 */
module.exports = async ({ tool_name, tool_input, tool_result }) => {
  console.log('[Hook] Tool executed:', tool_name);
  // Add your logging logic here
};
`;
  }

  // ============ HELPERS ============

  private mapHookRow(row: typeof cliProviderHooks.$inferSelect): CliHook {
    return {
      id: row.id,
      projectId: row.projectId,
      provider: row.provider as CliProvider,
      name: row.name,
      hookType: row.hookType,
      script: row.script,
      enabled: Boolean(row.enabled),
      scope: row.scope as 'project' | 'global',
      syncedAt: row.syncedAt ? new Date(row.syncedAt) : null,
      createdAt: new Date(row.createdAt!),
      updatedAt: new Date(row.updatedAt!),
    };
  }

  private mapSettingsRow(row: typeof cliProviderSettings.$inferSelect): CliSettings {
    return {
      id: row.id,
      projectId: row.projectId,
      provider: row.provider as CliProvider,
      settings: JSON.parse(row.settings),
      scope: row.scope as 'project' | 'global',
      syncedAt: row.syncedAt ? new Date(row.syncedAt) : null,
      createdAt: new Date(row.createdAt!),
      updatedAt: new Date(row.updatedAt!),
    };
  }
}
