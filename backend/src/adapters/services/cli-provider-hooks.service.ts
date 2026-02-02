/**
 * CLI Provider Hooks Service
 * Manages hooks and settings for CLI providers (Claude, Gemini, Codex, etc.)
 * Handles CRUD operations and filesystem sync
 */

import { writeFile, mkdir, unlink, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDatabase } from '../../infrastructure/database/connection.js';
import { cliProviderHooks, cliProviderSettings, projects } from '../../infrastructure/database/schema.js';

// Supported CLI providers
export type CliProvider = 'claude' | 'gemini' | 'codex';

// Hook types per provider (from official docs)
// Claude: https://code.claude.com/docs/en/hooks
export const PROVIDER_HOOK_TYPES: Record<CliProvider, string[]> = {
  claude: [
    // Session lifecycle
    'SessionStart',
    'SessionEnd',
    // User input
    'UserPromptSubmit',
    // Tool execution
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    // Permissions
    'PermissionRequest',
    'Notification',
    // Subagents
    'SubagentStart',
    'SubagentStop',
    // Other
    'Stop',
    'PreCompact',
    // Fallback for unmatched hooks
    'Unknown',
  ],
  gemini: ['PreToolUse', 'PostToolUse', 'PrePrompt', 'PostPrompt', 'Unknown'],
  codex: ['PreToolUse', 'PostToolUse', 'PreExec', 'PostExec', 'Unknown'],
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
  matcher?: string;  // Optional: e.g., "Write|Edit|Bash" for PreToolUse
  timeout?: number;  // Optional: timeout in seconds
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
  matcher?: string;  // Optional: e.g., "Write|Edit|Bash"
  timeout?: number;  // Optional: timeout in seconds
}

export interface UpdateHookInput {
  name?: string;
  hookType?: string;
  script?: string;
  enabled?: boolean;
  matcher?: string | null;
  timeout?: number | null;
}

// Claude settings.json structure (from official docs)
export interface ClaudeHookConfig {
  matcher?: string;  // e.g., "Bash", "Write|Edit"
  hooks: Array<{
    type: 'command' | 'prompt' | 'agent';
    command?: string;
    prompt?: string;
    timeout?: number;
    async?: boolean;
  }>;
}

export interface ClaudeSettings {
  hooks?: {
    [eventType: string]: ClaudeHookConfig[];
  };
  disableAllHooks?: boolean;
}

// Scan result for filesystem hooks
export interface ScannedHook {
  name: string;
  hookType: string;  // From settings.json or 'Unknown'
  matcher?: string;  // From settings.json
  filePath: string;
  inDb: boolean;
  inFs: boolean;
  differs: boolean | null;  // null if not in both
  dbHookId?: string;
}

// Import result
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
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
      matcher: input.matcher ?? null,
      timeout: input.timeout ?? null,
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
    if (input.matcher !== undefined) updates.matcher = input.matcher;
    if (input.timeout !== undefined) updates.timeout = input.timeout;

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
   * Sync a hook to filesystem (writes hook file + updates settings.json)
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
      if (!projectPath) throw new Error(`Project not found for hook ${hook.name} (projectId: ${hook.projectId})`);
    }

    // For project scope without projectId, we need a valid project path
    if (hook.scope === 'project' && !projectPath) {
      throw new Error(`Cannot sync project-scoped hook "${hook.name}" without a valid project. Please set a project or change scope to global.`);
    }

    const basePath = hook.scope === 'global' ? undefined : projectPath;
    const hooksDir = this.getHooksDir(hook.provider, basePath);
    console.log(`[CLI Hooks] Syncing hook "${hook.name}" to: ${hooksDir}`);

    // Ensure hooks directory exists
    if (!existsSync(hooksDir)) {
      await mkdir(hooksDir, { recursive: true });
    }

    // Detect script type for file extension
    const isBash = hook.script.trim().startsWith('#!/bin/bash') ||
                   hook.script.trim().startsWith('#!/usr/bin/env bash') ||
                   hook.script.trim().startsWith('#!/bin/sh');
    const ext = isBash ? 'sh' : 'cjs';

    // Write hook file
    const filePath = join(hooksDir, `${hook.name}.${ext}`);
    await writeFile(filePath, hook.script, 'utf-8');

    // Update settings.json to register the hook (Claude provider only for now)
    if (hook.provider === 'claude') {
      await this.updateClaudeSettingsForHook(hook, basePath);
    }

    // Update syncedAt
    const db = getDatabase();
    await db.update(cliProviderHooks)
      .set({ syncedAt: new Date().toISOString() })
      .where(eq(cliProviderHooks.id, hookId));
  }

  /**
   * Update .claude/settings.json to register a hook
   */
  private async updateClaudeSettingsForHook(hook: CliHook, projectPath?: string): Promise<void> {
    const settingsPath = this.getSettingsPath('claude', projectPath);
    const settingsDir = join(settingsPath, '..');

    // Ensure .claude directory exists
    if (!existsSync(settingsDir)) {
      await mkdir(settingsDir, { recursive: true });
    }

    // Read existing settings or create new
    let settings: ClaudeSettings = {};
    if (existsSync(settingsPath)) {
      try {
        const content = await readFile(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch {
        console.warn(`[CLI Hooks] Could not parse existing settings.json, creating new`);
      }
    }

    // Initialize hooks structure
    if (!settings.hooks) {
      settings.hooks = {};
    }
    if (!settings.hooks[hook.hookType]) {
      settings.hooks[hook.hookType] = [];
    }

    // Detect script type from shebang
    const isBashScript = hook.script.trim().startsWith('#!/bin/bash') ||
                         hook.script.trim().startsWith('#!/usr/bin/env bash') ||
                         hook.script.trim().startsWith('#!/bin/sh');
    const ext = isBashScript ? 'sh' : 'cjs';

    // Build command with %CLAUDE_PROJECT_DIR% for portability
    const hookPath = `"%CLAUDE_PROJECT_DIR%"/.claude/hooks/${hook.name}.${ext}`;
    const hookCommand = isBashScript ? `bash ${hookPath}` : `node ${hookPath}`;

    // Check if hook already registered
    const existingIndex = settings.hooks[hook.hookType].findIndex(config =>
      config.hooks?.some(h => h.command === hookCommand)
    );

    if (existingIndex === -1 && hook.enabled) {
      // Build hook entry - only include timeout if configured
      const hookEntry: { type: 'command'; command: string; timeout?: number } = {
        type: 'command',
        command: hookCommand,
      };

      // Add timeout only if configured on hook
      if (hook.timeout) hookEntry.timeout = hook.timeout;

      // Build hook config - only include matcher if configured
      const hookConfig: ClaudeHookConfig = {
        hooks: [hookEntry],
      };

      // Add matcher only if configured on hook
      if (hook.matcher) hookConfig.matcher = hook.matcher;

      settings.hooks[hook.hookType].push(hookConfig);
      console.log(`[CLI Hooks] Registered "${hook.name}" in settings.json for ${hook.hookType}`);
    }

    // Write updated settings
    await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
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

  // ============ FILESYSTEM IMPORT (FS → DB) ============

  /**
   * Parse Claude settings.json from filesystem
   */
  async parseClaudeSettings(projectPath?: string): Promise<ClaudeSettings | null> {
    const settingsPath = this.getSettingsPath('claude', projectPath);

    if (!existsSync(settingsPath)) {
      return null;
    }

    try {
      const content = await readFile(settingsPath, 'utf-8');
      return JSON.parse(content) as ClaudeSettings;
    } catch (error) {
      console.error(`Failed to parse Claude settings: ${error}`);
      return null;
    }
  }

  /**
   * Find hook type from settings.json by matching hook filename
   */
  findHookTypeFromSettings(
    hookFileName: string,
    settings: ClaudeSettings
  ): { eventType: string; matcher?: string } | null {
    if (!settings.hooks) return null;

    for (const [eventType, configs] of Object.entries(settings.hooks)) {
      for (const config of configs) {
        for (const hook of config.hooks || []) {
          // Match by command path containing the filename
          if (hook.command?.includes(hookFileName)) {
            return { eventType, matcher: config.matcher };
          }
        }
      }
    }
    return null;
  }

  /**
   * Scan filesystem for hooks and compare with DB
   */
  async scanFilesystem(
    provider: CliProvider,
    projectPath?: string,
    projectId?: string
  ): Promise<ScannedHook[]> {
    const hooksDir = this.getHooksDir(provider, projectPath);
    const results: ScannedHook[] = [];

    // Get existing DB hooks for comparison
    const dbHooks = await this.listHooks({
      projectId: projectId ?? null,
      provider,
    });

    // Parse settings.json for hook type detection (Claude only for now)
    let settings: ClaudeSettings | null = null;
    if (provider === 'claude') {
      settings = await this.parseClaudeSettings(projectPath);
    }

    // Scan filesystem
    if (existsSync(hooksDir)) {
      try {
        const files = await readdir(hooksDir);
        const hookFiles = files.filter(f => f.endsWith('.cjs') || f.endsWith('.js'));

        for (const file of hookFiles) {
          const name = file.replace(/\.(cjs|js)$/, '');
          const filePath = join(hooksDir, file);
          const fsContent = await readFile(filePath, 'utf-8');

          // Find matching DB hook
          const dbHook = dbHooks.find(h => h.name === name);

          // Detect hook type from settings.json
          let hookType = 'Unknown';
          let matcher: string | undefined;
          if (settings) {
            const detected = this.findHookTypeFromSettings(file, settings);
            if (detected) {
              hookType = detected.eventType;
              matcher = detected.matcher;
            }
          }

          results.push({
            name,
            hookType: dbHook?.hookType || hookType,
            matcher,
            filePath,
            inDb: !!dbHook,
            inFs: true,
            differs: dbHook ? dbHook.script !== fsContent : null,
            dbHookId: dbHook?.id,
          });
        }
      } catch (error) {
        console.error(`Failed to scan hooks directory: ${error}`);
      }
    }

    // Add DB hooks that are NOT in filesystem
    for (const dbHook of dbHooks) {
      if (!results.find(r => r.name === dbHook.name)) {
        results.push({
          name: dbHook.name,
          hookType: dbHook.hookType,
          filePath: join(hooksDir, `${dbHook.name}.cjs`),
          inDb: true,
          inFs: false,
          differs: null,
          dbHookId: dbHook.id,
        });
      }
    }

    return results;
  }

  /**
   * Import hooks from filesystem to database
   */
  async importHooksFromFilesystem(
    provider: CliProvider,
    projectPath?: string,
    projectId?: string,
    updateExisting: boolean = true
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    // Scan filesystem first
    const scanned = await this.scanFilesystem(provider, projectPath, projectId);

    for (const hook of scanned) {
      // Skip hooks not in filesystem
      if (!hook.inFs) {
        continue;
      }

      try {
        // Read hook content from filesystem
        const content = await readFile(hook.filePath, 'utf-8');

        if (!hook.inDb) {
          // Create new hook in DB
          await this.createHook({
            projectId: projectId,
            provider,
            name: hook.name,
            hookType: hook.hookType,
            script: content,
            enabled: true,
            scope: projectPath ? 'project' : 'global',
          });
          result.imported++;
        } else if (hook.differs && updateExisting) {
          // Update existing hook if content differs
          await this.updateHook(hook.dbHookId!, { script: content });
          result.updated++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(`${hook.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Get diff between DB hook and filesystem
   */
  async getHookDiff(hookId: string): Promise<{ dbContent: string; fsContent: string | null; differs: boolean } | null> {
    const hook = await this.getHookById(hookId);
    if (!hook) return null;

    // Get project path
    let projectPath: string | undefined;
    if (hook.projectId) {
      const db = getDatabase();
      const rows = await db.select().from(projects).where(eq(projects.id, hook.projectId));
      projectPath = rows[0]?.path;
    }

    const hooksDir = this.getHooksDir(hook.provider, hook.scope === 'global' ? undefined : projectPath);
    const filePath = join(hooksDir, `${hook.name}.cjs`);

    let fsContent: string | null = null;
    if (existsSync(filePath)) {
      fsContent = await readFile(filePath, 'utf-8');
    }

    return {
      dbContent: hook.script,
      fsContent,
      differs: fsContent !== null && fsContent !== hook.script,
    };
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
      matcher: row.matcher ?? undefined,
      timeout: row.timeout ?? undefined,
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
