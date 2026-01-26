/**
 * Approval Controller
 * HTTP endpoints for approval management and resolution
 */

import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { ResolveApprovalUseCase } from '../../use-cases/approvals/resolve-approval.use-case.js';
import { Approval, ApprovalStatus, ToolCategory } from '../../domain/entities/approval.entity.js';
import { IEventBus, ApprovalPendingEvent } from '../../domain/events/event-bus.js';
import {
  ApprovalGateConfig,
  DEFAULT_APPROVAL_GATE,
} from '../../domain/value-objects/approval-gate-config.vo.js';

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
  resolveApprovalUseCase: ResolveApprovalUseCase;
  eventBus: IEventBus;
  config?: ApprovalGateConfig;
}

export function registerApprovalController(
  app: FastifyInstance,
  deps: ApprovalControllerDeps
): void {
  const { approvalRepo, diffRepo, resolveApprovalUseCase, eventBus, config = DEFAULT_APPROVAL_GATE } = deps;

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

    const result = await resolveApprovalUseCase.execute(id, 'reject', body?.decidedBy ?? 'user');

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
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

    // Determine tool category
    const category = determineToolCategory(toolName, toolInput, config);

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

    // Create approval record with toolUseId in payload for deduplication
    const approvalType = isFileOperation(toolName) ? 'diff' : 'tool';
    const approval = Approval.create(
      requestId,
      sessionId,
      approvalType,
      { type: approvalType, toolName, toolInput, toolUseId },
      category,
      config.timeoutSeconds,
      config.defaultOnTimeout
    );

    await approvalRepo.save(approval);

    // Publish event for WebSocket notification
    eventBus.publish([
      new ApprovalPendingEvent(requestId, sessionId, toolName, timeoutAt),
    ]);

    app.log.info({ requestId, sessionId, toolName, category, toolUseId }, 'Approval request created from hook');

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
}

// Helper: Determine tool category based on config
function determineToolCategory(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: ApprovalGateConfig
): ToolCategory {
  // Auto-allow safe tools
  if (config.autoAllowTools.includes(toolName)) {
    return 'safe';
  }

  // Check dangerous patterns for Bash
  if (toolName === 'Bash') {
    const command = String(toolInput.command ?? '');
    for (const pattern of config.dangerousPatterns.commands) {
      if (new RegExp(pattern, 'i').test(command)) {
        return 'dangerous';
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
        return 'dangerous';
      }
    }
  }

  // Tools that require approval
  if (config.requireApprovalTools.includes(toolName)) {
    return 'requires-approval';
  }

  return 'safe';
}

// Helper: Check if tool is a file operation
function isFileOperation(toolName: string): boolean {
  return ['Write', 'Edit', 'NotebookEdit', 'Bash'].includes(toolName);
}
