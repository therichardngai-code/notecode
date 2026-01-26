/**
 * Fastify Server
 * HTTP server setup with CORS, rate limiting, WebSocket, SSE, and controller registration
 */

import Fastify, { FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  registerProjectController,
  registerTaskController,
  registerSessionController,
  registerApprovalController,
  registerMemoryController,
} from '../../adapters/controllers/index.js';
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
import { LanceDBMemoryRepository } from '../../adapters/repositories/lancedb-memory.repository.js';
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
import { getEventBus } from '../../domain/events/event-bus.js';

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

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register rate limiting
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: 60000,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
    }),
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
    settingsRepo,
    cliExecutor,
    eventBus
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

  // Register controllers
  registerProjectController(app, projectRepo);
  registerTaskController(app, taskRepo);
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
    resolveApprovalUseCase,
    eventBus,
  });
  registerMemoryController(
    app,
    memoryRepo,
    extractMemoryUseCase,
    memoryInjectionService
  );

  // Register SSE notifications
  if (options.enableSSE !== false) {
    registerNotificationSSE(app, eventBus);
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
      setupWebSocket(app, cliExecutor, sessionRepo, messageRepo, approvalRepo, eventBus);
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
  eventBus: ReturnType<typeof getEventBus>
): void {
  // Create WebSocket server in noServer mode
  const wss = new WebSocketServer({ noServer: true });

  // Create session stream handler
  wsHandler = new SessionStreamHandler(
    wss,
    cliExecutor,
    sessionRepo,
    messageRepo
  );

  // Create and attach approval interceptor
  const approvalInterceptor = new ApprovalInterceptorService(
    approvalRepo,
    wsHandler,
    eventBus
  );
  wsHandler.setApprovalInterceptor(approvalInterceptor);
  app.log.info('Approval interceptor attached to WebSocket handler');

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
