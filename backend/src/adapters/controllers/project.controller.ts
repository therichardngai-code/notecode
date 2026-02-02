/**
 * Project Controller
 * HTTP endpoints for project management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { Project } from '../../domain/entities/project.entity.js';
import { CliProviderHooksService } from '../services/cli-provider-hooks.service.js';
import { ApprovalGateConfig } from '../../domain/value-objects/approval-gate-config.vo.js';

const createProjectSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isFavorite: z.boolean().optional().default(false),
});

// ApprovalGateConfig schema (matches domain VO)
const approvalGateSchema = z.object({
  enabled: z.boolean(),
  timeoutSeconds: z.number().int().positive().optional(),
  defaultOnTimeout: z.enum(['approve', 'deny']).optional(),
  autoAllowTools: z.array(z.string()).optional(),
  requireApprovalTools: z.array(z.string()).optional(),
  dangerousPatterns: z.object({
    commands: z.array(z.string()).optional(),
    files: z.array(z.string()).optional(),
  }).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  isFavorite: z.boolean().optional(),
  systemPrompt: z.string().nullable().optional(),
  approvalGate: approvalGateSchema.nullable().optional(),
});

export function registerProjectController(
  app: FastifyInstance,
  projectRepo: IProjectRepository,
  cliHooksService?: CliProviderHooksService
): void {
  // GET /api/projects - List all projects
  app.get('/api/projects', async (request, reply) => {
    const { search, favorite } = request.query as Record<string, string>;

    const projects = await projectRepo.findAll({
      search,
      isFavorite: favorite === 'true' ? true : undefined,
    });

    return reply.send({ projects });
  });

  // GET /api/projects/recent - Get recent projects
  app.get('/api/projects/recent', async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    const projects = await projectRepo.findRecent(
      limit ? parseInt(limit, 10) : 10
    );
    return reply.send({ projects });
  });

  // GET /api/projects/favorites - Get favorite projects
  app.get('/api/projects/favorites', async (_request, reply) => {
    const projects = await projectRepo.findFavorites();
    return reply.send({ projects });
  });

  // GET /api/projects/by-path - Find project by path
  app.get('/api/projects/by-path', async (request, reply) => {
    const { path } = request.query as { path?: string };

    if (!path) {
      return reply.status(400).send({ error: 'Path is required' });
    }

    const project = await projectRepo.findByPath(path);

    if (!project) {
      return reply.send({ project: null, exists: false });
    }

    return reply.send({ project, exists: true });
  });

  // GET /api/projects/:id - Get single project
  app.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectRepo.findById(id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send({ project });
  });

  // POST /api/projects - Create project
  app.post('/api/projects', async (request, reply) => {
    const body = createProjectSchema.parse(request.body);

    // Check if path already exists
    const existing = await projectRepo.exists(body.path);
    if (existing) {
      return reply.status(409).send({ error: 'Project with this path already exists' });
    }

    const now = new Date();
    const project = new Project(
      randomUUID(),
      body.name,
      body.path,
      null, // systemPrompt - can be set later via update
      null, // approvalGate - can be set later via update
      body.isFavorite,
      now,
      now
    );

    await projectRepo.save(project);
    return reply.status(201).send({ project });
  });

  // PATCH /api/projects/:id - Update project
  app.patch('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProjectSchema.parse(request.body);

    const project = await projectRepo.findById(id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Capture current state for approval gate comparison
    const wasEnabled = project.approvalGate?.enabled ?? false;

    if (body.name) {
      project.updateName(body.name);
    }
    if (body.isFavorite !== undefined) {
      if (body.isFavorite) {
        project.markAsFavorite();
      } else {
        project.unmarkAsFavorite();
      }
    }
    if (body.systemPrompt !== undefined) {
      project.updateSystemPrompt(body.systemPrompt);
    }
    if (body.approvalGate !== undefined) {
      project.updateApprovalGate(body.approvalGate);
    }

    await projectRepo.save(project);

    // Handle approvalGate changes - auto-provision/unprovision CLI hook
    console.log(`[Project] approvalGate check: body.approvalGate=${JSON.stringify(body.approvalGate)}, cliHooksService=${!!cliHooksService}`);
    if (body.approvalGate !== undefined && cliHooksService) {
      const isEnabled = body.approvalGate?.enabled ?? false;
      console.log(`[Project] wasEnabled=${wasEnabled}, isEnabled=${isEnabled}`);

      try {
        if (!wasEnabled && isEnabled) {
          // Turning ON: provision hook
          await cliHooksService.provisionApprovalGateHook(
            'project',
            id,
            body.approvalGate as ApprovalGateConfig
          );
          console.log(`[Project] Approval gate enabled for project ${id} - hook provisioned`);
        } else if (wasEnabled && !isEnabled) {
          // Turning OFF: unprovision hook
          await cliHooksService.unprovisionApprovalGateHook('project', id);
          console.log(`[Project] Approval gate disabled for project ${id} - hook unprovisioned`);
        } else if (isEnabled) {
          // Config changed while enabled: re-sync
          await cliHooksService.provisionApprovalGateHook(
            'project',
            id,
            body.approvalGate as ApprovalGateConfig
          );
          console.log(`[Project] Approval gate config updated for project ${id} - hook re-synced`);
        }
      } catch (error) {
        console.error(`[Project] Failed to provision/unprovision approval gate hook for project ${id}:`, error);
        // Don't fail the project update, just log the error
      }
    }

    return reply.send({ project });
  });

  // POST /api/projects/:id/access - Record project access
  app.post('/api/projects/:id/access', async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = await projectRepo.findById(id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    project.recordAccess();
    await projectRepo.save(project);
    return reply.send({ project });
  });

  // DELETE /api/projects/:id - Delete project
  app.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await projectRepo.delete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send({ success: true });
  });
}
