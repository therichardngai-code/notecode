/**
 * Files Controller
 * API endpoints for file system operations
 */

import type { FastifyPluginAsync } from 'fastify';
import { FileSystemService, PathTraversalError, FileLimitExceededError, BinaryFileError, FileTooLargeError } from '../../infrastructure/file-system/file-system.service.js';
import { SqliteProjectRepository } from '../repositories/sqlite-project.repository.js';

const fileSystemService = new FileSystemService();

export const filesRoutes: FastifyPluginAsync = async (fastify) => {
  const projectRepo = new SqliteProjectRepository();

  /**
   * GET /api/projects/:projectId/files/tree
   * Get file tree for project
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { path?: string };
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
            path: { type: 'string', default: '/', description: 'Root path' }
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
                  children: { type: 'array' }
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
      const { path: relativePath = '/' } = request.query;

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

        // Build file tree
        const tree = await fileSystemService.buildFileTree(project.path, {
          relativePath,
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
};
