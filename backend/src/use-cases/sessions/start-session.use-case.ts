/**
 * Start Session Use Case
 * Creates a new session for a task and spawns CLI process
 */

import { randomUUID } from 'crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { IAgentRepository } from '../../domain/ports/repositories/agent.repository.port.js';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';
import { ISettingsRepository } from '../../adapters/repositories/sqlite-settings.repository.js';
import { ICliExecutor, CliSpawnConfig } from '../../domain/ports/gateways/cli-executor.port.js';
import { IEventBus, SessionStartedEvent } from '../../domain/events/event-bus.js';
import { Project } from '../../domain/entities/project.entity.js';
import { Session } from '../../domain/entities/session.entity.js';
import { Message } from '../../domain/entities/message.entity.js';
import { SessionStatus, TaskStatus, ProviderType } from '../../domain/value-objects/task-status.vo.js';
import { createEmptyTokenUsage, createEmptyToolStats } from '../../domain/value-objects/token-usage.vo.js';

export interface StartSessionRequest {
  taskId: string;
  agentId?: string;
  initialPrompt?: string;
  resumeSessionId?: string;
  forkSession?: boolean;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  maxBudgetUsd?: number;
  /**
   * Session start mode:
   * - 'renew': Fresh session, no history (default)
   * - 'retry': Resume last session (--resume)
   * - 'fork': New session but keeps context (--resume --fork-session)
   */
  mode?: 'renew' | 'retry' | 'fork';
  // Session-level overrides
  model?: string;  // Override task model for this session
  files?: string[];  // Files to add to context
  disableWebTools?: boolean;  // Disable WebSearch/WebFetch
}

export interface StartSessionResponse {
  success: boolean;
  session?: Session;
  error?: string;
}

export class StartSessionUseCase {
  constructor(
    private sessionRepo: ISessionRepository,
    private taskRepo: ITaskRepository,
    private projectRepo: IProjectRepository,
    private agentRepo: IAgentRepository,
    private messageRepo: IMessageRepository,
    private settingsRepo: ISettingsRepository,
    private cliExecutor: ICliExecutor,
    private eventBus: IEventBus
  ) {}

  async execute(request: StartSessionRequest): Promise<StartSessionResponse> {
    // 1. Validate task exists
    const task = await this.taskRepo.findById(request.taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // 2. Get project to determine working directory
    const project = await this.projectRepo.findById(task.projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // 3. Check task status - must be IN_PROGRESS to start session
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return { success: false, error: `Task must be in-progress to start session (current: ${task.status})` };
    }

    // 4. Check for existing sessions
    const existingSessions = await this.sessionRepo.findByTaskId(task.id);
    const runningSession = existingSessions.find(s => s.status === SessionStatus.RUNNING);
    if (runningSession && !request.forkSession) {
      return { success: false, error: 'Task already has a running session' };
    }

    // 5. Handle mode: retry/fork - find last session to resume
    let resumeFromSessionId = request.resumeSessionId;
    let shouldFork = request.forkSession ?? false;

    if ((request.mode === 'retry' || request.mode === 'fork') && !resumeFromSessionId && existingSessions.length > 0) {
      // Find most recent session with providerSessionId
      const lastSession = existingSessions
        .filter(s => s.providerSessionId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (lastSession) {
        resumeFromSessionId = lastSession.providerSessionId!;
      }
    }

    // Fork mode sets forkSession flag
    if (request.mode === 'fork') {
      shouldFork = true;
    }

    // Calculate attempt number
    const attemptNumber = existingSessions.length + 1;

    // Determine resume mode for this session
    const resumeMode = existingSessions.length === 0 ? null : (request.mode ?? 'renew');

    // Find source session for resumedFromSessionId
    let resumedFromSessionId: string | null = null;
    if (resumeFromSessionId && (request.mode === 'retry' || request.mode === 'fork')) {
      const sourceSession = existingSessions.find(s => s.providerSessionId === resumeFromSessionId);
      resumedFromSessionId = sourceSession?.id ?? null;
    }

    // Record attempt on task
    task.recordAttempt(resumeMode);
    await this.taskRepo.save(task);

    // 4. Get global settings for defaults
    const settings = await this.settingsRepo.getGlobal();

    // 5. Determine working directory: task contextFiles[0] > project path > cwd
    const workingDir = task.contextFiles[0] ?? project.path ?? process.cwd();

    // 6. Resolve provider and model from task → settings (required)
    if (!settings.defaultProvider || !settings.defaultModel) {
      return { success: false, error: 'Settings missing required defaultProvider or defaultModel' };
    }
    const provider = task.provider ?? (settings.defaultProvider as ProviderType);
    // Model priority: request override > task config > settings default
    const model = request.model ?? task.model ?? settings.defaultModel;
    // Don't use fallback if same as main model
    const fallbackModel = settings.fallbackModel !== model ? settings.fallbackModel : undefined;
    const sessionId = randomUUID();
    // 8. Set parentSessionId when forking or resuming
    const parentSessionId = (request.forkSession || resumeFromSessionId)
      ? resumeFromSessionId ?? null
      : null;

    // 8. Create session entity with context tracking for delta injection
    // Note: initialPrompt (storedPrompt) will be set after prompt resolution below
    const session = new Session(
      sessionId,
      task.id,
      request.agentId ?? task.agentId,
      parentSessionId,
      null, // providerSessionId - set after spawn
      resumeMode,
      attemptNumber,
      resumedFromSessionId,
      null, // initialPrompt - set after prompt resolution
      `${task.title} - Session ${attemptNumber}`,
      SessionStatus.QUEUED,
      provider,
      null, // processId - set after spawn
      workingDir,
      null, null, null,
      createEmptyTokenUsage(),
      [],
      createEmptyToolStats(),
      [...task.contextFiles], // Track included context files for delta on resume
      [...task.skills],       // Track included skills for delta on resume
      new Date(),
      new Date()
    );

    // 9. Build initial prompt from task title + description + context files + skills (first user message)
    const contextFilesSection = task.contextFiles.length > 0
      ? `\n\n<context-files>\n${task.contextFiles.map(f => `@${f}`).join('\n')}\n</context-files>`
      : '';

    // Add skill files as context with priority-based path resolution
    const resolvedSkillPaths = task.skills
      .map(s => this.resolveSkillPath(provider, s, project.path))
      .filter((p): p is string => p !== null);
    const skillFilesSection = resolvedSkillPaths.length > 0
      ? `\n\n<skills>\n${resolvedSkillPaths.map(p => `@${p}`).join('\n')}\n</skills>`
      : '';

    // Determine effective prompt (to CLI) and display prompt (for user message):
    // 1. If request.initialPrompt provided → use it (user typed new message)
    // 2. If retry/fork without new prompt → look up previous session's initialPrompt
    // 3. Otherwise → build from task description (CLI gets XML, display gets plain text)
    let effectivePrompt: string;      // Sent to CLI (may include XML wrapper)
    let displayPrompt: string;        // Saved to user message (user-friendly)
    let storedPrompt: string | null = null;  // What to store in session.initialPrompt

    if (request.initialPrompt) {
      // User provided new prompt - use as-is for both
      effectivePrompt = request.initialPrompt;
      displayPrompt = request.initialPrompt;
      storedPrompt = request.initialPrompt;
    } else if ((request.mode === 'retry' || request.mode === 'fork') && existingSessions.length > 0) {
      // Retry/Fork without new prompt - look up previous session's initialPrompt
      const lastSessionWithPrompt = existingSessions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .find(s => s.initialPrompt);
      if (lastSessionWithPrompt?.initialPrompt) {
        effectivePrompt = lastSessionWithPrompt.initialPrompt;
        displayPrompt = lastSessionWithPrompt.initialPrompt;
        // Don't store again - inherit from chain
      } else {
        // No previous prompt found, fall back to task description
        effectivePrompt = `<task>\n<title>${task.title}</title>\n<description>${task.description || 'No description'}</description>\n</task>${contextFilesSection}${skillFilesSection}`;
        displayPrompt = task.description || task.title || 'Start task';
      }
    } else {
      // New session - build from task description
      // CLI gets full XML with context, display gets plain description
      effectivePrompt = `<task>\n<title>${task.title}</title>\n<description>${task.description || 'No description'}</description>\n</task>${contextFilesSection}${skillFilesSection}`;
      displayPrompt = task.description || task.title || 'Start task';
      storedPrompt = displayPrompt;  // Store user-friendly version for retry
    }

    // Store the prompt in session entity (for retry persistence)
    session.initialPrompt = storedPrompt;

    // 10. Build system prompt: settings (global) → project (override) → agent memory (append)
    const systemPrompt = await this.buildSystemPrompt(project, settings, session.agentId);

    // 11. Build allowed tools list
    let allowedTools = task.tools?.mode === 'allowlist' ? [...task.tools.tools] : undefined;

    // If subagentDelegates enabled, discover agents and add as Task(agentname)
    if (task.subagentDelegates) {
      const discoveredAgents = this.discoverCustomAgents(provider, project.path);
      if (discoveredAgents) {
        const agentTools = Object.keys(discoveredAgents).map(name => `Task(${name})`);
        if (allowedTools) {
          // Add Task(agentname) for each discovered agent
          allowedTools.push(...agentTools);
        }
        // If no allowlist, all tools including Task(agentname) are available by default
      }
    }

    // 12. Build CLI spawn config
    const cliConfig: CliSpawnConfig = {
      provider: provider,
      model: model,
      workingDir: session.workingDir,
      sessionId: sessionId,
      agentName: task.agentRole ?? undefined,  // Pass agent role to --agent flag
      initialPrompt: effectivePrompt,
      systemPrompt: systemPrompt,
      resumeSessionId: resumeFromSessionId,
      forkSession: shouldFork,
      allowedTools: allowedTools,
      disallowedTools: task.tools?.mode === 'blocklist' ? task.tools.tools : undefined,
      permissionMode: request.permissionMode ?? task.permissionMode ?? 'default',
      maxBudgetUsd: request.maxBudgetUsd,
      fallbackModel: fallbackModel,
      // Session-level options
      files: request.files,
      disableWebTools: request.disableWebTools,
    };

    // 12. Spawn CLI process
    try {
      const cliProcess = await this.cliExecutor.spawn(cliConfig);

      // 13. Update session with process info
      session.start(cliProcess.sessionId, cliProcess.processId);
      await this.sessionRepo.save(session);

      // 14. Save initial prompt as user message (user-friendly, not XML)
      const userMessage = Message.createUserMessage(
        randomUUID(),
        session.id,
        displayPrompt
      );
      await this.messageRepo.save(userMessage);

      // 15. Publish event
      this.eventBus.publish([
        new SessionStartedEvent(session.id, task.id, session.provider)
      ]);

      return { success: true, session };

    } catch (error) {
      // Session failed to spawn
      session.fail(error instanceof Error ? error.message : 'Unknown error');
      await this.sessionRepo.save(session);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to spawn CLI process'
      };
    }
  }

  /**
   * Build system prompt with hierarchy: settings (global) → project (override) → agent memory (append)
   */
  private async buildSystemPrompt(
    project: Project,
    settings: { systemPrompt?: string },
    agentId: string | null
  ): Promise<string | undefined> {
    const parts: string[] = [];

    // 1. Get base system prompt: project override > settings default
    const basePrompt = project.systemPrompt ?? settings.systemPrompt;
    if (basePrompt) {
      parts.push(basePrompt);
    }

    // 2. Append agent context + memory if agent assigned
    if (agentId) {
      const agent = await this.agentRepo.findById(agentId);
      if (agent) {
        // Add agent role description
        if (agent.description) {
          parts.push(`## Agent Role\n${agent.description}`);
        }

        // Add agent memory (previous session summaries)
        if (agent.injectPreviousSummaries) {
          const summaries = await this.agentRepo.getSummaries(agent.id, agent.maxSummariesToInject);
          if (summaries.length > 0) {
            const memorySection = summaries
              .map(s => `[Session ${s.sessionId.slice(0, 8)}] ${s.summary}`)
              .join('\n');
            parts.push(`## Previous Context\n${memorySection}`);
          }
        }
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : undefined;
  }

  /**
   * Resolve skill file path with priority-based lookup
   * Priority (matches agent discovery order):
   * 1. {project}/.claude/skills/{skill}/SKILL.md (project provider-specific)
   * 2. {project}/.notecode/skills/{skill}/SKILL.md (project universal)
   * 3. ~/.claude/skills/{skill}/SKILL.md (user provider-specific)
   * 4. ~/.notecode/skills/{skill}/SKILL.md (user universal)
   */
  private resolveSkillPath(
    provider: ProviderType,
    skillName: string,
    projectPath: string
  ): string | null {
    const providerFolder = this.getProviderFolder(provider);
    const skillFile = `skills/${skillName}/SKILL.md`;
    const home = homedir();

    // Priority order (matches agent discovery)
    const candidates = [
      join(projectPath, providerFolder, skillFile),   // 1. project/.claude/
      join(projectPath, '.notecode', skillFile),      // 2. project/.notecode/
      join(home, providerFolder, skillFile),          // 3. ~/.claude/
      join(home, '.notecode', skillFile),             // 4. ~/.notecode/
    ];

    // Return first existing path
    for (const path of candidates) {
      if (existsSync(path)) {
        return path;
      }
    }

    // No skill file found
    return null;
  }

  /**
   * Map provider to folder name
   */
  private getProviderFolder(provider: ProviderType): string {
    const folders: Record<ProviderType, string> = {
      [ProviderType.ANTHROPIC]: '.claude',
      [ProviderType.GOOGLE]: '.gemini',
      [ProviderType.OPENAI]: '.openai',
    };
    return folders[provider] ?? '.notecode';
  }

  /**
   * Discover custom agents from multiple folders with priority
   * Priority (lower wins):
   *   1. {project}/.claude/agents/
   *   2. {project}/.notecode/agents/
   *   3. ~/.claude/agents/
   *   4. ~/.notecode/agents/
   */
  private discoverCustomAgents(
    provider: ProviderType,
    projectPath: string
  ): Record<string, { description: string; prompt: string; tools?: string[]; model?: string }> | undefined {
    const providerFolder = this.getProviderFolder(provider);
    const home = homedir();

    // Priority order (first match wins for same agent name)
    const agentDirs = [
      join(projectPath, providerFolder, 'agents'),   // 1. project/.claude/agents/
      join(projectPath, '.notecode', 'agents'),      // 2. project/.notecode/agents/
      join(home, providerFolder, 'agents'),          // 3. ~/.claude/agents/
      join(home, '.notecode', 'agents'),             // 4. ~/.notecode/agents/
    ];

    const agents: Record<string, { description: string; prompt: string; tools?: string[]; model?: string }> = {};

    for (const dir of agentDirs) {
      if (!existsSync(dir)) continue;

      try {
        const files = readdirSync(dir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const agentName = basename(file, '.md');
          // Skip if already discovered (higher priority)
          if (agents[agentName]) continue;

          const filePath = join(dir, file);
          const parsed = this.parseAgentFile(filePath);
          if (parsed) {
            agents[agentName] = parsed;
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return Object.keys(agents).length > 0 ? agents : undefined;
  }

  /**
   * Parse agent markdown file with YAML frontmatter
   * Format: ---\nname: ...\ndescription: ...\n---\n<prompt body>
   */
  private parseAgentFile(filePath: string): { description: string; prompt: string; tools?: string[]; model?: string } | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

      if (!frontmatterMatch) return null;

      const frontmatter = frontmatterMatch[1];
      const prompt = frontmatterMatch[2].trim();

      // Parse YAML frontmatter (simple parser)
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      const toolsMatch = frontmatter.match(/tools:\s*(.+)/);
      const modelMatch = frontmatter.match(/model:\s*(.+)/);

      if (!descMatch) return null;

      const result: { description: string; prompt: string; tools?: string[]; model?: string } = {
        description: descMatch[1].trim(),
        prompt: prompt,
      };

      if (toolsMatch) {
        result.tools = toolsMatch[1].split(',').map(t => t.trim());
      }
      if (modelMatch) {
        result.model = modelMatch[1].trim();
      }

      return result;
    } catch {
      return null;
    }
  }
}
