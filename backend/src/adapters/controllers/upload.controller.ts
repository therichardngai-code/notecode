/**
 * Upload Controller
 * HTTP endpoints for file uploads (multipart/form-data)
 * Saves uploads to project folder: {project.path}/.notecode/uploads/{id}/
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';

// Upload response structure
interface UploadResponse {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] ?? 'application/octet-stream';
}

export function registerUploadController(
  app: FastifyInstance,
  projectRepo: IProjectRepository
): void {
  // POST /api/projects/:projectId/uploads - Upload file to project folder
  app.post('/api/projects/:projectId/uploads', async (request: FastifyRequest, reply) => {
    const { projectId } = request.params as { projectId: string };

    // Validate project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Check if multipart
    if (!request.isMultipart()) {
      return reply.status(400).send({ error: 'Content-Type must be multipart/form-data' });
    }

    try {
      // Get file from multipart request
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Generate unique ID for upload
      const uploadId = randomUUID();
      const filename = data.filename;
      const mimeType = data.mimetype || getMimeType(filename);

      // Create upload directory in project folder: {project.path}/.notecode/uploads/{id}/
      const uploadDir = join(project.path, '.notecode', 'uploads', uploadId);
      await mkdir(uploadDir, { recursive: true });

      // Read file buffer and write to disk
      const buffer = await data.toBuffer();
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      // Build response - path relative to project root
      const relativePath = join('.notecode', 'uploads', uploadId, filename);
      const response: UploadResponse = {
        id: uploadId,
        path: relativePath,
        filename,
        mimeType,
        size: buffer.length,
      };

      return reply.status(201).send(response);
    } catch (error) {
      app.log.error(error, 'File upload failed');
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'File upload failed',
      });
    }
  });
}
