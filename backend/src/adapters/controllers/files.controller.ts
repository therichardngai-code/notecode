/**
 * Files Controller
 * API endpoints for file system operations
 */

import type { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { FileSystemService, PathTraversalError, FileLimitExceededError, BinaryFileError, FileTooLargeError } from '../../infrastructure/file-system/file-system.service.js';
import { PathValidator } from '../../infrastructure/file-system/path-validator.js';
import { SqliteProjectRepository } from '../repositories/sqlite-project.repository.js';

const execAsync = promisify(exec);

const fileSystemService = new FileSystemService();

export const filesRoutes: FastifyPluginAsync = async (fastify) => {
  const projectRepo = new SqliteProjectRepository();

  /**
   * GET /api/projects/:projectId/files/tree
   * Get file tree for project with lazy loading support
   *
   * Query params:
   * - path: Root path to load (default: /)
   * - depth: Depth to load (1 = immediate children only, for lazy loading)
   * - showAll: Skip ignore patterns (default: false)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { path?: string; depth?: string; showAll?: string };
  }>(
    '/projects/:projectId/files/tree',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            path: { type: 'string', default: '/', description: 'Root path to load' },
            depth: { type: 'string', description: 'Depth to load (1 = immediate children only)' },
            showAll: { type: 'string', description: 'Show all files (skip .gitignore)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tree: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  path: { type: 'string' },
                  type: { type: 'string', enum: ['file', 'directory'] },
                  children: { type: 'array' },
                  hasChildren: { type: 'boolean' }
                }
              }
            }
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const {
        path: relativePath = '/',
        depth,
        showAll
      } = request.query;

      // Parse depth (undefined = load all, number = load N levels)
      const loadDepth = depth ? parseInt(depth, 10) : undefined;
      const skipIgnore = showAll === 'true';

      try {
        // Find project
        const project = await projectRepo.findById(projectId);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Verify project path exists
        try {
          const stats = await import('fs/promises').then(fs => fs.stat(project.path));
          if (!stats.isDirectory()) {
            return reply.code(404).send({ error: 'Project path is not a directory' });
          }
        } catch (error) {
          return reply.code(404).send({ error: 'Project path not found' });
        }

        // Build file tree with lazy loading options
        const tree = await fileSystemService.buildFileTree(project.path, {
          relativePath,
          loadDepth,
          skipIgnore,
        });

        return reply.send({ tree });
      } catch (error: any) {
        fastify.log.error('File tree error:', error);

        if (error instanceof PathTraversalError) {
          return reply.code(403).send({ error: 'Invalid path - access denied' });
        }

        if (error instanceof FileLimitExceededError) {
          return reply.code(413).send({ error: error.message });
        }

        if (error.code === 'EACCES') {
          return reply.code(403).send({ error: 'Permission denied' });
        }

        return reply.code(500).send({ error: 'Failed to read file tree' });
      }
    }
  );

  /**
   * GET /api/projects/:projectId/files/content
   * Read file content
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { path: string };
  }>(
    '/projects/:projectId/files/content',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          }
        },
        querystring: {
          type: 'object',
          required: ['path'],
          properties: {
            path: { type: 'string', description: 'File path relative to project' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              path: { type: 'string' },
              size: { type: 'number' },
              encoding: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { path: filePath } = request.query;

      if (!filePath) {
        return reply.code(400).send({ error: 'File path is required' });
      }

      try {
        // Find project
        const project = await projectRepo.findById(projectId);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Read file content
        const fileContent = await fileSystemService.readFileContent(
          project.path,
          filePath
        );

        return reply.send(fileContent);
      } catch (error: any) {
        fastify.log.error('File read error:', error);

        if (error instanceof PathTraversalError) {
          return reply.code(403).send({ error: 'Invalid path - access denied' });
        }

        if (error instanceof BinaryFileError) {
          return reply.code(415).send({ error: 'Binary files are not supported' });
        }

        if (error instanceof FileTooLargeError) {
          return reply.code(413).send({ error: error.message });
        }

        if (error.code === 'ENOENT') {
          return reply.code(404).send({ error: 'File not found' });
        }

        if (error.code === 'EACCES') {
          return reply.code(403).send({ error: 'Permission denied' });
        }

        if (error.message?.includes('not a file')) {
          return reply.code(400).send({ error: 'Path is not a file' });
        }

        return reply.code(500).send({ error: 'Failed to read file content' });
      }
    }
  );

  /**
   * PUT /api/projects/:projectId/files/content
   * Save file content
   */
  fastify.put<{
    Params: { projectId: string };
    Body: { path: string; content: string };
  }>(
    '/projects/:projectId/files/content',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          }
        },
        body: {
          type: 'object',
          required: ['path', 'content'],
          properties: {
            path: { type: 'string', description: 'File path relative to project' },
            content: { type: 'string', description: 'File content to save' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              path: { type: 'string' },
              size: { type: 'number' }
            }
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { path: filePath, content } = request.body;

      if (!filePath) {
        return reply.code(400).send({ error: 'File path is required' });
      }

      try {
        // Find project
        const project = await projectRepo.findById(projectId);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Validate path (prevents traversal attacks)
        const absolutePath = PathValidator.validate(project.path, filePath);

        // Write file content
        await fs.writeFile(absolutePath, content, 'utf-8');
        const stats = await fs.stat(absolutePath);

        return reply.send({
          success: true,
          path: filePath,
          size: stats.size
        });
      } catch (error: any) {
        fastify.log.error('File save error:', error);

        if (error instanceof PathTraversalError) {
          return reply.code(403).send({ error: 'Invalid path - access denied' });
        }

        if (error.code === 'EACCES') {
          return reply.code(403).send({ error: 'Permission denied' });
        }

        if (error.code === 'ENOENT') {
          return reply.code(404).send({ error: 'Directory not found' });
        }

        return reply.code(500).send({ error: 'Failed to save file' });
      }
    }
  );

  /**
   * POST /api/projects/:projectId/files/open-external
   * Open file in external editor (VS Code, Cursor, or system default)
   */
  fastify.post<{
    Params: { projectId: string };
    Body: { filePath: string; line?: number };
  }>(
    '/projects/:projectId/files/open-external',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          }
        },
        body: {
          type: 'object',
          required: ['filePath'],
          properties: {
            filePath: { type: 'string', description: 'File path relative to project' },
            line: { type: 'number', description: 'Optional line number to jump to' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              editor: { type: 'string' }
            }
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { filePath, line } = request.body;

      try {
        // Find project
        const project = await projectRepo.findById(projectId);
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Validate path (prevents traversal attacks)
        const absolutePath = PathValidator.validate(project.path, filePath);

        // Check file exists
        const stats = await fs.stat(absolutePath);
        if (!stats.isFile()) {
          return reply.code(400).send({ error: 'Path is not a file' });
        }

        // Escape quotes for shell command safety
        const safePath = absolutePath.replace(/"/g, '\\"');
        const lineArg = line ? `:${line}` : '';

        let editor = '';
        let command = '';

        // Try VS Code first
        try {
          await execAsync('code --version');
          command = `code --goto "${safePath}${lineArg}"`;
          editor = 'VS Code';
        } catch {
          // Try Cursor (VS Code fork)
          try {
            await execAsync('cursor --version');
            command = `cursor --goto "${safePath}${lineArg}"`;
            editor = 'Cursor';
          } catch {
            // Fallback to system default
            if (process.platform === 'win32') {
              command = `start "" "${safePath}"`;
            } else if (process.platform === 'darwin') {
              command = `open "${safePath}"`;
            } else {
              command = `xdg-open "${safePath}"`;
            }
            editor = 'System default';
          }
        }

        // Execute command
        await execAsync(command);

        return reply.send({
          success: true,
          message: `File opened in ${editor}`,
          editor
        });
      } catch (error: any) {
        fastify.log.error('Open external editor error:', error);

        if (error instanceof PathTraversalError) {
          return reply.code(403).send({ error: 'Invalid path - access denied' });
        }

        if (error.code === 'ENOENT') {
          return reply.code(404).send({ error: 'File not found' });
        }

        if (error.code === 'EACCES') {
          return reply.code(403).send({ error: 'Permission denied' });
        }

        return reply.code(500).send({
          error: 'Failed to open file in external editor',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
};
