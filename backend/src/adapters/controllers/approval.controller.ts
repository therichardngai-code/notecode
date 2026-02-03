/**
 * Approval Controller
 * HTTP endpoints for approval management and resolution
 */

import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { ResolveApprovalUseCase } from '../../use-cases/approvals/resolve-approval.use-case.js';
import { DiffExtractorService } from '../gateways/diff-extractor.service.js';
import { Approval, ApprovalStatus, ToolCategory } from '../../domain/entities/approval.entity.js';
import { IEventBus, ApprovalPendingEvent } from '../../domain/events/event-bus.js';
import {
  ApprovalGateConfig,
  DEFAULT_APPROVAL_GATE,
} from '../../domain/value-objects/approval-gate-config.vo.js';
import { ApprovalGateConfig as UserApprovalGateConfig } from '../repositories/sqlite-settings.repository.js';

// Schema for resolving approval
const resolveApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  decidedBy: z.string().optional().default('user'),
});

// Schema for hook approval request
const hookApprovalRequestSchema = z.object({
  sessionId: z.string(),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  toolUseId: z.string().optional(),
});

// Dependencies container
export interface ApprovalControllerDeps {
  approvalRepo: IApprovalRepository;
  diffRepo: IDiffRepository;
  diffExtractor?: DiffExtractorService;  // For discarding pending ops on rejection
  resolveApprovalUseCase: ResolveApprovalUseCase;
  eventBus: IEventBus;
  config?: ApprovalGateConfig;
  // Optional: for dynamic config endpoint
  sessionRepo?: ISessionRepository;
  taskRepo?: ITaskRepository;
  projectRepo?: IProjectRepository;
  settingsRepo?: ISettingsRepository;
}

export function registerApprovalController(
  app: FastifyInstance,
  deps: ApprovalControllerDeps
): void {
  const {
    approvalRepo, diffRepo, diffExtractor, resolveApprovalUseCase, eventBus,
    config = DEFAULT_APPROVAL_GATE,
    sessionRepo, taskRepo, projectRepo, settingsRepo
  } = deps;

  // GET /api/approvals/pending - List pending approvals
  app.get('/api/approvals/pending', async (_request, reply) => {
    const approvals = await approvalRepo.findPending();
    return reply.send({ approvals });
  });

  // GET /api/approvals/:id - Get single approval
  app.get('/api/approvals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const approval = await approvalRepo.findById(id);

    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    // Fetch related diffs
    const relatedDiffs = await diffRepo.findByApprovalId(id);

    return reply.send({ approval, diffs: relatedDiffs });
  });

  // POST /api/approvals/:id/approve - Approve
  app.post('/api/approvals/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = resolveApprovalSchema.parse({ ...request.body as object, action: 'approve' });

    const result = await resolveApprovalUseCase.execute(id, 'approve', body.decidedBy);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // POST /api/approvals/:id/reject - Reject
  app.post('/api/approvals/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { decidedBy?: string } | undefined;

    // Get approval to extract toolUseId before rejection
    const approval = await approvalRepo.findById(id);
    const toolUseId = approval?.payload?.toolUseId as string | undefined;

    const result = await resolveApprovalUseCase.execute(id, 'reject', body?.decidedBy ?? 'user');

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    // Discard pending diff operation (hook-based approval flow)
    if (diffExtractor && toolUseId) {
      diffExtractor.discardOperation(toolUseId);
      console.log(`[Approval] Discarded pending diff for rejected tool (toolUseId: ${toolUseId})`);
    }

    return reply.send({ success: true });
  });

  // GET /api/approvals/session/:sessionId - List approvals for session
  app.get('/api/approvals/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const approvals = await approvalRepo.findBySessionId(sessionId);
    return reply.send({ approvals });
  });

  // GET /api/approvals/session/:sessionId/pending - List pending approvals for session
  app.get('/api/approvals/session/:sessionId/pending', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const approvals = await approvalRepo.findPendingBySessionId(sessionId);
    return reply.send({ approvals });
  });

  // GET /api/diffs/session/:sessionId - List diffs for session
  app.get('/api/diffs/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const sessionDiffs = await diffRepo.findBySessionId(sessionId);
    return reply.send({ diffs: sessionDiffs });
  });

  // GET /api/diffs/:id - Get single diff
  app.get('/api/diffs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const diff = await diffRepo.findById(id);

    if (!diff) {
      return reply.status(404).send({ error: 'Diff not found' });
    }

    return reply.send({ diff });
  });

  // POST /api/approvals/request - Create approval request from hook
  // Hook calls this to create approval and get requestId for polling
  app.post('/api/approvals/request', async (request, reply) => {
    const body = hookApprovalRequestSchema.parse(request.body);
    const { sessionId, toolName, toolInput, toolUseId } = body;

    // Determine tool category (now returns matchedPattern for dangerous ops)
    const { category, matchedPattern, matchType } = determineToolCategory(toolName, toolInput, config);

    // If auto-allowed, return immediately
    if (category === 'safe') {
      return reply.send({
        requestId: null,
        decision: 'allow',
        reason: 'Auto-allowed tool',
      });
    }

    // Deduplication: Check for existing pending approval with same toolUseId
    if (toolUseId) {
      const pendingApprovals = await approvalRepo.findPendingBySessionId(sessionId);
      const existingApproval = pendingApprovals.find(
        (a) => a.payload.toolName === toolName && a.payload.toolUseId === toolUseId
      );

      if (existingApproval) {
        app.log.info(
          { requestId: existingApproval.id, sessionId, toolName, toolUseId },
          'Returning existing pending approval (deduplicated)'
        );
        return reply.send({
          requestId: existingApproval.id,
          timeoutAt: existingApproval.timeoutAt.getTime(),
          timeoutSeconds: Math.ceil(existingApproval.remainingTimeMs / 1000),
        });
      }
    }

    const requestId = randomUUID();
    const timeoutAt = new Date(Date.now() + config.timeoutSeconds * 1000);

    // Create approval record with matchedPattern for UI feedback
    const approvalType = isFileOperation(toolName) ? 'diff' : 'tool';
    const approval = Approval.create(
      requestId,
      sessionId,
      approvalType,
      { type: approvalType, toolName, toolInput, toolUseId, matchedPattern, matchType },
      category,
      config.timeoutSeconds,
      config.defaultOnTimeout
    );

    await approvalRepo.save(approval);

    // Publish event for WebSocket notification
    eventBus.publish([
      new ApprovalPendingEvent(requestId, sessionId, toolName, timeoutAt),
    ]);

    app.log.info({ requestId, sessionId, toolName, category, matchedPattern, toolUseId }, 'Approval request created from hook');

    return reply.send({
      requestId,
      timeoutAt: timeoutAt.getTime(),
      timeoutSeconds: config.timeoutSeconds,
    });
  });

  // GET /api/approvals/:id/status - Poll approval status (for hook)
  app.get('/api/approvals/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const approval = await approvalRepo.findById(id);

    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    // Check if expired and update status
    if (approval.isPending() && approval.isExpired()) {
      approval.timeout();
      await approvalRepo.save(approval);
    }

    // Map status to hook decision
    let decision: 'pending' | 'allow' | 'deny' = 'pending';
    if (approval.status === ApprovalStatus.APPROVED) {
      decision = 'allow';
    } else if (approval.status === ApprovalStatus.REJECTED) {
      decision = 'deny';
    } else if (approval.status === ApprovalStatus.TIMEOUT) {
      decision = approval.autoAction === 'approve' ? 'allow' : 'deny';
    }

    return reply.send({
      status: approval.status,
      decision,
      decidedBy: approval.decidedBy,
      remainingMs: approval.remainingTimeMs,
    });
  });

  // GET /api/approvals/config/:sessionId - Get merged approval config for session
  // Hook calls this to get dynamic config based on project/global settings
  app.get('/api/approvals/config/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    // If repos not available, return default config
    if (!sessionRepo || !taskRepo || !projectRepo || !settingsRepo) {
      return reply.send(config);
    }

    try {
      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return reply.send(config);
      }

      const task = await taskRepo.findById(session.taskId);
      if (!task) {
        return reply.send(config);
      }

      const project = await projectRepo.findById(task.projectId);
      const settings = await settingsRepo.getGlobal();

      // Merge: project > global > defaults
      const mergedConfig = mergeApprovalGateConfigs(
        config,
        settings.approvalGate,
        project?.approvalGate
      );

      return reply.send(mergedConfig);
    } catch (error) {
      app.log.error({ error, sessionId }, 'Failed to get approval config');
      return reply.send(config);
    }
  });
}

// Result from category check - includes matched pattern for UI feedback
interface CategoryResult {
  category: ToolCategory;
  matchedPattern?: string;  // The pattern that triggered dangerous category
  matchType?: 'command' | 'file';  // What type of pattern matched
}

// Helper: Determine tool category based on config
function determineToolCategory(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: ApprovalGateConfig
): CategoryResult {
  // Auto-allow safe tools
  if (config.autoAllowTools.includes(toolName)) {
    return { category: 'safe' };
  }

  // Check dangerous patterns for Bash
  if (toolName === 'Bash') {
    const command = String(toolInput.command ?? '');
    for (const pattern of config.dangerousPatterns.commands) {
      if (new RegExp(pattern, 'i').test(command)) {
        return { category: 'dangerous', matchedPattern: pattern, matchType: 'command' };
      }
    }
  }

  // Check dangerous patterns for file operations
  if (isFileOperation(toolName)) {
    const filePath = String(
      toolInput.file_path ?? toolInput.filePath ?? toolInput.path ?? ''
    );
    for (const pattern of config.dangerousPatterns.files) {
      if (new RegExp(pattern, 'i').test(filePath)) {
        return { category: 'dangerous', matchedPattern: pattern, matchType: 'file' };
      }
    }
  }

  // Tools that require approval
  if (config.requireApprovalTools.includes(toolName)) {
    return { category: 'requires-approval' };
  }

  return { category: 'safe' };
}

// Helper: Check if tool is a file operation
function isFileOperation(toolName: string): boolean {
  return ['Write', 'Edit', 'NotebookEdit', 'Bash'].includes(toolName);
}

/**
 * Merge user-defined approval gate configs with defaults
 * Priority: project > global > defaults
 *
 * User config has 3 sections:
 * - toolRules: Tool-level actions (Bash → ask, Write → approve)
 * - dangerousCommands: Custom command patterns (regex)
 * - dangerousFiles: Custom file patterns (regex)
 */
function mergeApprovalGateConfigs(
  defaults: ApprovalGateConfig,
  globalGate: UserApprovalGateConfig | null | undefined,
  projectGate: UserApprovalGateConfig | null | undefined
): ApprovalGateConfig {
  // Start with defaults
  const merged: ApprovalGateConfig = {
    enabled: defaults.enabled,
    timeoutSeconds: defaults.timeoutSeconds,
    defaultOnTimeout: defaults.defaultOnTimeout,
    autoAllowTools: [...defaults.autoAllowTools],
    requireApprovalTools: [...defaults.requireApprovalTools],
    dangerousPatterns: {
      commands: [...defaults.dangerousPatterns.commands],
      files: [...defaults.dangerousPatterns.files],
    },
  };

  // Apply global settings
  if (globalGate?.enabled) {
    applyUserConfig(merged, globalGate);
  }

  // Apply project settings (override global)
  if (projectGate?.enabled) {
    applyUserConfig(merged, projectGate);
  }

  // If either gate is disabled, disable the whole thing
  if (globalGate?.enabled === false || projectGate?.enabled === false) {
    merged.enabled = false;
  }

  return merged;
}

/**
 * Apply user-defined config to merged config
 * Handles all 3 sections: toolRules, dangerousCommands, dangerousFiles
 */
function applyUserConfig(
  config: ApprovalGateConfig,
  userConfig: UserApprovalGateConfig
): void {
  // 1. Apply tool rules
  if (userConfig.toolRules) {
    for (const rule of userConfig.toolRules) {
      const toolName = rule.tool;

      switch (rule.action) {
        case 'approve':
          // Add to auto-allow if not already there
          if (!config.autoAllowTools.includes(toolName)) {
            config.autoAllowTools.push(toolName);
          }
          // Remove from require-approval if present
          config.requireApprovalTools = config.requireApprovalTools.filter(t => t !== toolName);
          break;

        case 'deny':
        case 'ask':
          // Remove from auto-allow
          config.autoAllowTools = config.autoAllowTools.filter(t => t !== toolName);
          // Add to require-approval
          if (!config.requireApprovalTools.includes(toolName)) {
            config.requireApprovalTools.push(toolName);
          }
          break;
      }
    }
  }

  // 2. Add custom dangerous command patterns
  if (userConfig.dangerousCommands) {
    for (const pattern of userConfig.dangerousCommands) {
      if (pattern && !config.dangerousPatterns.commands.includes(pattern)) {
        config.dangerousPatterns.commands.push(pattern);
      }
    }
  }

  // 3. Add custom dangerous file patterns
  if (userConfig.dangerousFiles) {
    for (const pattern of userConfig.dangerousFiles) {
      if (pattern && !config.dangerousPatterns.files.includes(pattern)) {
        config.dangerousPatterns.files.push(pattern);
      }
    }
  }
}
