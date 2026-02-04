/**
 * Fastify Server
 * HTTP server setup with CORS, rate limiting, WebSocket, SSE, and controller registration
 */

import Fastify, { FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import {
  registerProjectController,
  registerTaskController,
  registerSessionController,
  registerApprovalController,
  registerMemoryController,
  registerUploadController,
  registerChatController,
  registerGitController,
  registerHookController,
  registerSystemController,
  registerSettingsController,
  registerVersionController,
  registerBackupController,
  registerCliProviderHooksController,
  registerFilesController,
  registerAnalyticsController,
  registerDiffController,
} from '../../adapters/controllers/index.js';
import { DiffRevertService } from '../../domain/services/diff-revert.service.js';
import { TaskStatusTransitionService } from '../../domain/services/task-status-transition.service.js';
import { OrphanCleanupService } from '../../domain/services/orphan-cleanup.service.js';
import { startCleanupScheduler } from '../scheduler/cleanup-job.js';
import { DiffExtractorService } from '../../adapters/gateways/diff-extractor.service.js';
import { CliProviderHooksService } from '../../adapters/services/cli-provider-hooks.service.js';
import { registerNotificationSSE } from '../../adapters/sse/notification-sse.handler.js';
import { SessionStreamHandler } from '../../adapters/websocket/session-stream.handler.js';
import { SqliteProjectRepository } from '../../adapters/repositories/sqlite-project.repository.js';
import { SqliteTaskRepository } from '../../adapters/repositories/sqlite-task.repository.js';
import { SqliteSessionRepository } from '../../adapters/repositories/sqlite-session.repository.js';
import { SqliteAgentRepository } from '../../adapters/repositories/sqlite-agent.repository.js';
import { SqliteMessageRepository } from '../../adapters/repositories/sqlite-message.repository.js';
import { SqliteApprovalRepository } from '../../adapters/repositories/sqlite-approval.repository.js';
import { SqliteDiffRepository } from '../../adapters/repositories/sqlite-diff.repository.js';
import { SqliteSettingsRepository } from '../../adapters/repositories/sqlite-settings.repository.js';
import { SqliteAgentSummaryRepository } from '../../adapters/repositories/sqlite-agent-summary.repository.js';
import { SqliteGitApprovalRepository } from '../../adapters/repositories/sqlite-git-approval.repository.js';
import { SqliteHookRepository } from '../../adapters/repositories/sqlite-hook.repository.js';
import { LanceDBMemoryRepository } from '../../adapters/repositories/lancedb-memory.repository.js';
import { GitService } from '../../domain/services/git.service.js';
import { HookExecutorService, HookContext } from '../../domain/services/hook-executor.service.js';
import { ShellHookRunner } from '../../adapters/services/shell-hook-runner.js';
import { HttpHookRunner } from '../../adapters/services/http-hook-runner.js';
import { WebSocketHookRunner } from '../../adapters/services/websocket-hook-runner.js';
import { HookEvent } from '../../domain/entities/hook.entity.js';
import { ClaudeCliAdapter } from '../../adapters/gateways/claude-cli.adapter.js';
import { GoogleEmbeddingAdapter } from '../../adapters/gateways/google-embedding.adapter.js';
import { OpenAIEmbeddingAdapter } from '../../adapters/gateways/openai-embedding.adapter.js';
import { SummaryExtractionService } from '../../adapters/services/summary-extraction.service.js';
import { MemoryInjectionService } from '../../adapters/services/memory-injection.service.js';
import { ExtractMemoryUseCase } from '../../use-cases/memory/extract-memory.use-case.js';
import { ApprovalInterceptorService } from '../../adapters/gateways/approval-interceptor.service.js';
import { StartSessionUseCase } from '../../use-cases/sessions/start-session.use-case.js';
import { StopSessionUseCase } from '../../use-cases/sessions/stop-session.use-case.js';
import { PauseSessionUseCase } from '../../use-cases/sessions/pause-session.use-case.js';
import { ResolveApprovalUseCase } from '../../use-cases/approvals/resolve-approval.use-case.js';
import { ExportDataUseCase } from '../../use-cases/backup/export-data.use-case.js';
import { VersionCheckService } from '../../adapters/services/version-check.service.js';
import { CliToolInterceptorService } from '../../adapters/services/cli-tool-interceptor.service.js';
import { getEventBus } from '../../domain/events/event-bus.js';
import { createGitCommitApproval } from '../../adapters/controllers/git.controller.js';

export interface ServerOptions {
  logger?: boolean;
  logLevel?: string;
  enableWebSocket?: boolean;
  enableSSE?: boolean;
}

// WebSocket server reference for external access
let wsHandler: SessionStreamHandler | null = null;

export function getWebSocketHandler(): SessionStreamHandler | null {
  return wsHandler;
}

export async function createServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger !== false ? {
      level: options.logLevel ?? process.env.LOG_LEVEL ?? 'info',
    } : false,
  });

  // Custom JSON parser that handles empty body (for endpoints like /sync that don't need body)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = body && (body as string).trim() ? JSON.parse(body as string) : {};
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register rate limiting (1000/min for dev - React SPA makes many concurrent requests)
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: 60000,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
    }),
  });

  // Register multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
  }));

  // API version endpoint
  app.get('/api/version', async () => ({
    version: process.env.npm_package_version ?? '0.1.0',
    node: process.version,
  }));

  // Initialize repositories
  const projectRepo = new SqliteProjectRepository();
  const taskRepo = new SqliteTaskRepository();
  const sessionRepo = new SqliteSessionRepository();
  const agentRepo = new SqliteAgentRepository();
  const messageRepo = new SqliteMessageRepository();
  const approvalRepo = new SqliteApprovalRepository();
  const diffRepo = new SqliteDiffRepository();
  const settingsRepo = new SqliteSettingsRepository();
  const agentSummaryRepo = new SqliteAgentSummaryRepository();
  const gitApprovalRepo = new SqliteGitApprovalRepository();
  const hookRepo = new SqliteHookRepository();

  // Initialize git service
  const gitService = new GitService();

  // Initialize hook system
  const shellRunner = new ShellHookRunner();
  const httpRunner = new HttpHookRunner();
  const wsRunner = new WebSocketHookRunner();
  const hookExecutor = new HookExecutorService(hookRepo, shellRunner, httpRunner, wsRunner);

  // Initialize CLI executor
  const cliExecutor = new ClaudeCliAdapter();

  // Initialize embedding gateway (settings > env)
  const globalSettings = await settingsRepo.getGlobal();
  const googleApiKey = globalSettings.apiKeys?.google ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  const openaiApiKey = globalSettings.apiKeys?.openai ?? process.env.OPENAI_API_KEY ?? '';

  // Create embedding gateway (Google > OpenAI > null)
  let embeddingGateway: GoogleEmbeddingAdapter | OpenAIEmbeddingAdapter | null = null;
  if (googleApiKey) {
    embeddingGateway = new GoogleEmbeddingAdapter(googleApiKey);
  } else if (openaiApiKey) {
    embeddingGateway = new OpenAIEmbeddingAdapter(openaiApiKey);
  }

  // Warn if memory system enabled but no embedding API key
  if (globalSettings.autoExtractSummary && !embeddingGateway) {
    console.warn('[Memory] Auto-extract enabled but no embedding API key configured. Set GOOGLE_API_KEY or OPENAI_API_KEY.');
  }

  // Initialize memory repository (null if no gateway)
  const memoryRepo = embeddingGateway
    ? new LanceDBMemoryRepository(embeddingGateway)
    : null;

  // Initialize memory services
  const summaryExtractionService = new SummaryExtractionService(
    messageRepo,
    agentSummaryRepo,
    memoryRepo,
    settingsRepo
  );
  const memoryInjectionService = new MemoryInjectionService(
    memoryRepo,
    agentSummaryRepo
  );

  // Initialize memory use case
  const extractMemoryUseCase = new ExtractMemoryUseCase(
    sessionRepo,
    taskRepo,
    summaryExtractionService
  );

  // Get event bus
  const eventBus = getEventBus();

  // Initialize use cases
  const startSessionUseCase = new StartSessionUseCase(
    sessionRepo,
    taskRepo,
    projectRepo,
    agentRepo,
    messageRepo,
    settingsRepo,
    cliExecutor,
    eventBus,
    gitService
  );
  const stopSessionUseCase = new StopSessionUseCase(
    sessionRepo,
    cliExecutor,
    eventBus
  );
  const pauseSessionUseCase = new PauseSessionUseCase(
    sessionRepo,
    cliExecutor
  );
  const resolveApprovalUseCase = new ResolveApprovalUseCase(approvalRepo);
  // Store for later wiring with interceptor
  (app as unknown as { resolveApprovalUseCase: ResolveApprovalUseCase }).resolveApprovalUseCase = resolveApprovalUseCase;

  // Initialize CLI provider hooks service (needed for approval gate auto-provision)
  const cliProviderHooksService = new CliProviderHooksService();

  // Create diff extractor early (needed by approval controller for rejection cleanup)
  const diffExtractor = new DiffExtractorService(diffRepo);

  // Register controllers
  registerProjectController(app, projectRepo, cliProviderHooksService);
  registerTaskController(app, taskRepo, {
    projectRepo,
    gitApprovalRepo,
    diffRepo,
    gitService,
    eventBus,
    settingsRepo,
    messageRepo,
  });
  registerSessionController(app, {
    sessionRepo,
    messageRepo,
    startSessionUseCase,
    stopSessionUseCase,
    pauseSessionUseCase,
  });
  registerApprovalController(app, {
    approvalRepo,
    diffRepo,
    diffExtractor,  // For discarding pending ops on rejection
    resolveApprovalUseCase,
    eventBus,
    // For dynamic config endpoint
    sessionRepo,
    taskRepo,
    projectRepo,
    settingsRepo,
  });
  registerMemoryController(
    app,
    memoryRepo,
    extractMemoryUseCase,
    memoryInjectionService
  );

  // Register upload controller (for clipboard paste screenshots)
  registerUploadController(app, projectRepo);

  // Register chat controller
  registerChatController(app, {
    projectRepo,
    taskRepo,
    sessionRepo,
    startSessionUseCase,
  });

  // Register hook controller
  registerHookController(app, hookRepo, hookExecutor);

  // Initialize diff revert service (for combined approval integration)
  const diffRevertService = new DiffRevertService(diffRepo);

  // Initialize orphan cleanup service (24h TTL for stale approvals/diffs)
  const orphanCleanupService = new OrphanCleanupService(
    gitApprovalRepo,
    diffRepo,
    sessionRepo,
    diffRevertService
  );
  startCleanupScheduler(orphanCleanupService);

  // Register diff controller (diff revert, batch operations)
  registerDiffController(app, diffRevertService, diffRepo, sessionRepo);

  // Register git controller (with diff integration for combined approval)
  registerGitController(
    app,
    taskRepo,
    projectRepo,
    gitApprovalRepo,
    gitService,
    eventBus,
    diffRevertService, // For combined approval (batch diff operations)
    sessionRepo // For getting session working dir
  );

  // Task status transition service (auto IN_PROGRESS → REVIEW → DONE)
  const taskTransitionService = new TaskStatusTransitionService(
    taskRepo,
    sessionRepo,
    diffRepo,
    gitService,
    eventBus
  );

  // Register CLI provider hooks controller (Claude, Gemini, Codex hooks management)
  registerCliProviderHooksController(app, cliProviderHooksService);

  // Register system controller (folder picker, path validation)
  registerSystemController(app);

  // Register files controller (file tree, file content for Explorer)
  await app.register(registerFilesController, { prefix: '/api' });

  // Register analytics controller (token usage, session stats)
  await app.register(registerAnalyticsController, { prefix: '/api' });

  // Register settings controller (pass cliProviderHooksService for approval gate auto-provision)
  registerSettingsController(app, settingsRepo, cliProviderHooksService);

  // Initialize and register version check
  const versionService = new VersionCheckService();
  registerVersionController(app, versionService);

  // Initialize and register backup/export
  const exportDataUseCase = new ExportDataUseCase(
    projectRepo,
    taskRepo,
    sessionRepo,
    messageRepo
  );
  registerBackupController(app, exportDataUseCase);

  // Wire hooks to event bus (including task status transitions)
  wireHooksToEventBus(
    eventBus,
    hookExecutor,
    taskRepo,
    sessionRepo,
    projectRepo,
    gitApprovalRepo,
    diffRepo,
    gitService,
    taskTransitionService
  );

  // Register SSE notifications
  if (options.enableSSE !== false) {
    registerNotificationSSE(app, eventBus);
  }

  // Serve static frontend (for npx/production mode)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicDir = join(__dirname, '../../../public');
  const hasPublicDir = existsSync(publicDir) && existsSync(join(publicDir, 'index.html'));

  if (hasPublicDir) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
      // Cache control for assets
      setHeaders: (res: { setHeader: (name: string, value: string) => void }, filePath: string) => {
        if (filePath.includes('/assets/')) {
          // Long cache for hashed assets (1 year)
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          // No cache for HTML
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    });

    // SPA fallback - serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      // Don't interfere with API/WS/SSE routes
      if (
        request.url.startsWith('/api/') ||
        request.url.startsWith('/ws/') ||
        request.url.startsWith('/sse/')
      ) {
        return reply.status(404).send({ error: 'Not Found' });
      }
      // Serve index.html for SPA routes (sendFile added by @fastify/static)
      return reply.sendFile('index.html');
    });

    app.log.info(`Static frontend served from ${publicDir}`);
  }

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error,
      });
    }

    // Handle known errors
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.message,
      });
    }

    // Unknown errors
    return reply.status(500).send({
      error: 'Internal Server Error',
    });
  });

  // Setup WebSocket after server is ready
  if (options.enableWebSocket !== false) {
    app.addHook('onReady', () => {
      setupWebSocket(app, cliExecutor, sessionRepo, messageRepo, approvalRepo, eventBus, settingsRepo, taskRepo, hookExecutor, diffExtractor);
    });
  }

  return app;
}

/**
 * Setup WebSocket server for session streaming
 */
function setupWebSocket(
  app: FastifyInstance,
  cliExecutor: ClaudeCliAdapter,
  sessionRepo: SqliteSessionRepository,
  messageRepo: SqliteMessageRepository,
  approvalRepo: SqliteApprovalRepository,
  eventBus: ReturnType<typeof getEventBus>,
  settingsRepo: SqliteSettingsRepository,
  taskRepo: SqliteTaskRepository,
  hookExecutor: HookExecutorService,
  diffExtractor: DiffExtractorService
): void {
  // Create WebSocket server in noServer mode
  const wss = new WebSocketServer({ noServer: true });

  // Create session stream handler with settingsRepo and taskRepo for auto-resume with delta tracking
  wsHandler = new SessionStreamHandler(
    wss,
    cliExecutor,
    sessionRepo,
    messageRepo,
    settingsRepo,
    taskRepo
  );

  // Create and attach approval interceptor
  const approvalInterceptor = new ApprovalInterceptorService(
    approvalRepo,
    wsHandler,
    eventBus
  );
  wsHandler.setApprovalInterceptor(approvalInterceptor);
  app.log.info('Approval interceptor attached to WebSocket handler');

  // Create and attach CLI tool interceptor (blocking hooks)
  const toolInterceptor = new CliToolInterceptorService(hookExecutor);
  wsHandler.setToolInterceptor(toolInterceptor);
  app.log.info('CLI tool interceptor attached to WebSocket handler');

  // Attach diff extractor to WebSocket handler (reuse instance from above)
  wsHandler.setDiffExtractor(diffExtractor);
  app.log.info('Diff extractor attached to WebSocket handler');

  // Attach event bus for session completion events (triggers task transitions + GitCommitApproval)
  wsHandler.setEventBus(eventBus);
  app.log.info('Event bus attached to WebSocket handler');

  // Wire up the approval use case callback to interceptor
  const resolveUseCase = (app as unknown as { resolveApprovalUseCase: ResolveApprovalUseCase }).resolveApprovalUseCase;
  if (resolveUseCase) {
    resolveUseCase.setOnResolvedCallback(async (requestId, action, decidedBy) => {
      await approvalInterceptor.handleUserResponse(requestId, action, decidedBy);
    });
  }

  // Subscribe to SessionStartedEvent to register CLI output subscription
  eventBus.subscribe('session.started', async (event) => {
    const sessionId = event.aggregateId;
    const session = await sessionRepo.findById(sessionId);
    if (session?.processId) {
      wsHandler!.registerSession(session.id, session.processId);
      app.log.info({ sessionId: session.id, processId: session.processId }, 'Registered session for CLI output streaming');
    }
  });

  // Handle HTTP upgrade for WebSocket
  app.server.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';

    if (url.startsWith('/ws/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  app.log.info('WebSocket server initialized on /ws/*');
}

/**
 * Wire hooks to EventBus for automatic execution on domain events
 */
function wireHooksToEventBus(
  eventBus: ReturnType<typeof getEventBus>,
  hookExecutor: HookExecutorService,
  taskRepo: SqliteTaskRepository,
  sessionRepo: SqliteSessionRepository,
  projectRepo: SqliteProjectRepository,
  gitApprovalRepo: SqliteGitApprovalRepository,
  diffRepo: SqliteDiffRepository,
  gitService: GitService,
  taskTransitionService: TaskStatusTransitionService
): void {
  // Helper to execute hooks silently (log errors but don't throw)
  const executeHooks = async (context: HookContext) => {
    try {
      const results = await hookExecutor.execute(context);
      for (const result of results) {
        if (!result.success) {
          console.warn(`[Hooks] Hook "${result.hookName}" failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('[Hooks] Execution error:', error);
    }
  };

  // Session events
  eventBus.subscribe('session.started', async (event) => {
    const session = await sessionRepo.findById(event.aggregateId);
    const task = session?.taskId ? await taskRepo.findById(session.taskId) : null;
    await executeHooks({
      event: 'session:start' as HookEvent,
      projectId: task?.projectId,
      taskId: session?.taskId ?? undefined,
      sessionId: event.aggregateId,
      data: { provider: (event as { provider?: string }).provider },
    });
  });

  eventBus.subscribe('session.completed', async (event) => {
    const session = await sessionRepo.findById(event.aggregateId);
    const task = session?.taskId ? await taskRepo.findById(session.taskId) : null;
    await executeHooks({
      event: 'session:end' as HookEvent,
      projectId: task?.projectId,
      taskId: session?.taskId ?? undefined,
      sessionId: event.aggregateId,
      data: { tokenUsage: (event as { tokenUsage?: unknown }).tokenUsage },
    });

    // Auto-trigger task status transition (IN_PROGRESS → REVIEW or DONE)
    if (task?.projectId) {
      const project = await projectRepo.findById(task.projectId);
      if (project?.path) {
        await taskTransitionService.onSessionCompleted(event.aggregateId, project.path);

        // Create GitCommitApproval if task transitioned to REVIEW (!autoCommit)
        // Re-fetch task to get updated status after transition
        const updatedTask = await taskRepo.findById(task.id);
        if (updatedTask && updatedTask.status === 'review' && !updatedTask.autoCommit) {
          await createGitCommitApproval(
            {
              id: updatedTask.id,
              projectId: updatedTask.projectId,
              title: updatedTask.title,
              autoCommit: updatedTask.autoCommit,
            },
            event.aggregateId, // sessionId for batch diff operations
            gitApprovalRepo,
            diffRepo,
            gitService,
            project.path,
            eventBus
          );
        }
      }
    }
  });

  eventBus.subscribe('session.failed', async (event) => {
    const session = await sessionRepo.findById(event.aggregateId);
    const task = session?.taskId ? await taskRepo.findById(session.taskId) : null;
    await executeHooks({
      event: 'session:error' as HookEvent,
      projectId: task?.projectId,
      taskId: session?.taskId ?? undefined,
      sessionId: event.aggregateId,
      data: { reason: (event as { reason?: string }).reason },
    });
  });

  // Task events
  eventBus.subscribe('task.created', async (event) => {
    await executeHooks({
      event: 'task:created' as HookEvent,
      projectId: (event as { projectId?: string }).projectId,
      taskId: event.aggregateId,
      data: { title: (event as { title?: string }).title },
    });
  });

  eventBus.subscribe('task.status.changed', async (event) => {
    await executeHooks({
      event: 'task:status:change' as HookEvent,
      projectId: (event as { projectId?: string }).projectId,
      taskId: event.aggregateId,
      data: {
        oldStatus: (event as { oldStatus?: string }).oldStatus,
        newStatus: (event as { newStatus?: string }).newStatus,
        status: (event as { newStatus?: string }).newStatus, // Alias for filters
      },
    });
  });

  // Approval events
  eventBus.subscribe('approval.pending', async (event) => {
    await executeHooks({
      event: 'approval:pending' as HookEvent,
      sessionId: (event as { sessionId?: string }).sessionId,
      data: {
        toolName: (event as { toolName?: string }).toolName,
        timeoutAt: (event as { timeoutAt?: Date }).timeoutAt?.toISOString(),
      },
    });
  });

  eventBus.subscribe('approval.resolved', async (event) => {
    await executeHooks({
      event: 'approval:resolved' as HookEvent,
      sessionId: (event as { sessionId?: string }).sessionId,
      data: {
        approved: (event as { approved?: boolean }).approved,
        toolName: (event as { toolName?: string }).toolName,
      },
    });
  });

  // Git events
  eventBus.subscribe('git:approval:created', async (event) => {
    await executeHooks({
      event: 'git:commit:created' as HookEvent,
      projectId: (event as { projectId?: string }).projectId,
      taskId: (event as { taskId?: string }).taskId,
      data: {
        commitMessage: (event as { commitMessage?: string }).commitMessage,
        filesChanged: (event as { filesChanged?: string[] }).filesChanged,
        diffSummary: (event as { diffSummary?: unknown }).diffSummary,
      },
    });
  });

  eventBus.subscribe('git:approval:resolved', async (event) => {
    await executeHooks({
      event: 'git:commit:approved' as HookEvent,
      projectId: (event as { projectId?: string }).projectId,
      data: {
        status: (event as { status?: string }).status,
        commit: (event as { commit?: unknown }).commit,
      },
    });

    // Auto-trigger task status transition (REVIEW → DONE or IN_PROGRESS)
    const approval = await gitApprovalRepo.findById(event.aggregateId);
    if (approval?.taskId) {
      const status = (event as { status?: string }).status;
      if (status === 'approved') {
        await taskTransitionService.onCommitApproved(approval.taskId);
      } else if (status === 'rejected') {
        await taskTransitionService.onCommitRejected(approval.taskId);
      }
    }
  });
}
