/**
 * Terminal Controller
 * REST API endpoints for terminal management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { ShellType, TERMINAL_CONFIG } from '../../domain/entities/terminal.entity.js';
import {
  createTerminal,
  closeTerminal,
  getTerminal,
  listTerminals,
  getTerminalCount,
} from '../websocket/terminal-stream.handler.js';

// Schema for creating terminal
const createTerminalSchema = z.object({
  shell: z.enum(['bash', 'zsh', 'powershell', 'cmd', 'sh']).optional(),
  cols: z.number().min(40).max(500).optional(),
  rows: z.number().min(10).max(200).optional(),
});

export interface TerminalControllerDeps {
  projectRepo: IProjectRepository;
}

export function registerTerminalController(
  app: FastifyInstance,
  deps: TerminalControllerDeps
): void {
  const { projectRepo } = deps;

  // POST /api/projects/:projectId/terminals - Create terminal
  app.post('/api/projects/:projectId/terminals', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = createTerminalSchema.parse(request.body ?? {});

    // Validate project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Create terminal
    const terminalId = randomUUID();
    const result = createTerminal(
      terminalId,
      projectId,
      project.path,
      body.shell as ShellType | undefined,
      body.cols,
      body.rows
    );

    // Check for error
    if ('error' in result) {
      return reply.status(429).send({ error: result.error });
    }

    const terminal = result;

    return reply.status(201).send({
      id: terminal.id,
      projectId: terminal.projectId,
      shell: terminal.shell,
      cwd: terminal.cwd,
      pid: terminal.pid,
      createdAt: terminal.createdAt,
      wsUrl: `/ws/terminal/${terminal.id}`,
    });
  });

  // GET /api/projects/:projectId/terminals - List terminals
  app.get('/api/projects/:projectId/terminals', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    // Validate project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const terminals = listTerminals(projectId);

    return reply.send({
      terminals: terminals.map(t => ({
        id: t.id,
        shell: t.shell,
        cwd: t.cwd,
        pid: t.pid,
        createdAt: t.createdAt,
        lastActivityAt: t.lastActivityAt,
        wsUrl: `/ws/terminal/${t.id}`,
      })),
      limits: {
        perProject: TERMINAL_CONFIG.maxTerminalsPerProject,
        total: TERMINAL_CONFIG.maxTerminalsTotal,
        currentProject: terminals.length,
        currentTotal: getTerminalCount(),
      },
    });
  });

  // GET /api/terminals/:terminalId - Get terminal details
  app.get('/api/terminals/:terminalId', async (request, reply) => {
    const { terminalId } = request.params as { terminalId: string };

    const terminal = getTerminal(terminalId);
    if (!terminal) {
      return reply.status(404).send({ error: 'Terminal not found' });
    }

    return reply.send({
      id: terminal.id,
      projectId: terminal.projectId,
      shell: terminal.shell,
      cwd: terminal.cwd,
      pid: terminal.pid,
      createdAt: terminal.createdAt,
      lastActivityAt: terminal.lastActivityAt,
      wsUrl: `/ws/terminal/${terminal.id}`,
    });
  });

  // DELETE /api/terminals/:terminalId - Close terminal
  app.delete('/api/terminals/:terminalId', async (request, reply) => {
    const { terminalId } = request.params as { terminalId: string };

    const terminal = getTerminal(terminalId);
    if (!terminal) {
      return reply.status(404).send({ error: 'Terminal not found' });
    }

    const closed = closeTerminal(terminalId);
    if (!closed) {
      return reply.status(500).send({ error: 'Failed to close terminal' });
    }

    return reply.send({ success: true });
  });
}
