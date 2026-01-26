/**
 * Start Session Use Case
 * Creates a new session for a task and spawns CLI process
 */

import { randomUUID } from 'crypto';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { IAgentRepository } from '../../domain/ports/repositories/agent.repository.port.js';
import { ISettingsRepository } from '../../adapters/repositories/sqlite-settings.repository.js';
import { ICliExecutor, CliSpawnConfig } from '../../domain/ports/gateways/cli-executor.port.js';
import { IEventBus, SessionStartedEvent } from '../../domain/events/event-bus.js';
import { Project } from '../../domain/entities/project.entity.js';
import { Session } from '../../domain/entities/session.entity.js';
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

    // 3. Check for existing running session
    const existingSessions = await this.sessionRepo.findByTaskId(task.id);
    const runningSession = existingSessions.find(s => s.status === SessionStatus.RUNNING);
    if (runningSession && !request.forkSession) {
      return { success: false, error: 'Task already has a running session' };
    }

    // 4. Get global settings for defaults
    const settings = await this.settingsRepo.getGlobal();

    // 5. Determine working directory: task contextFiles[0] > project path > cwd
    const workingDir = task.contextFiles[0] ?? project.path ?? process.cwd();

    // 6. Resolve provider and model from task → settings (required)
    if (!settings.defaultProvider || !settings.defaultModel) {
      return { success: false, error: 'Settings missing required defaultProvider or defaultModel' };
    }
    const provider = task.provider ?? (settings.defaultProvider as ProviderType);
    const model = task.model ?? settings.defaultModel;
    const fallbackModel = settings.fallbackModel;
    const sessionId = randomUUID();
    // 7. Set parentSessionId when forking or resuming
    const parentSessionId = (request.forkSession || request.resumeSessionId)
      ? request.resumeSessionId ?? null
      : null;

    // 8. Create session entity
    const session = new Session(
      sessionId,
      task.id,
      request.agentId ?? task.agentId,
      parentSessionId,
      null, // providerSessionId - set after spawn
      `${task.title} - Session ${existingSessions.length + 1}`,
      SessionStatus.QUEUED,
      provider,
      null, // processId - set after spawn
      workingDir,
      null, null, null,
      createEmptyTokenUsage(),
      [],
      createEmptyToolStats(),
      new Date(),
      new Date()
    );

    // 9. Build initial prompt from task title + description (first user message)
    const taskPrompt = request.initialPrompt
      ?? `<task>\n<title>${task.title}</title>\n<description>${task.description || 'No description'}</description>\n</task>`;

    // 10. Build system prompt: settings (global) → project (override) → agent memory (append)
    const systemPrompt = await this.buildSystemPrompt(project, settings, session.agentId);

    // 11. Build CLI spawn config
    const cliConfig: CliSpawnConfig = {
      provider: provider,
      model: model,
      workingDir: session.workingDir,
      sessionId: sessionId,
      initialPrompt: taskPrompt,
      systemPrompt: systemPrompt,
      resumeSessionId: request.resumeSessionId,
      forkSession: request.forkSession,
      allowedTools: task.tools?.mode === 'allowlist' ? task.tools.tools : undefined,
      disallowedTools: task.tools?.mode === 'blocklist' ? task.tools.tools : undefined,
      permissionMode: request.permissionMode ?? 'default',
      maxBudgetUsd: request.maxBudgetUsd,
      fallbackModel: fallbackModel,
    };

    // 12. Spawn CLI process
    try {
      const cliProcess = await this.cliExecutor.spawn(cliConfig);

      // 13. Update session with process info
      session.start(cliProcess.sessionId, cliProcess.processId);
      await this.sessionRepo.save(session);

      // 14. Update task status if not started
      if (task.status === TaskStatus.NOT_STARTED) {
        task.start();
        await this.taskRepo.save(task);
      }

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
}
