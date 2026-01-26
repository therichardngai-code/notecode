/**
 * SSE Notification Handler
 * Server-Sent Events for broadcasting domain events to clients
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IEventBus, DomainEvent } from '../../domain/events/event-bus.js';

// Active SSE clients
const clients = new Set<FastifyReply>();

/**
 * Register SSE notification endpoint
 * Clients connect to receive real-time domain events
 */
export function registerNotificationSSE(app: FastifyInstance, eventBus: IEventBus): void {
  // SSE endpoint for notifications
  app.get('/sse/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
    });

    // Add client to active set
    clients.add(reply);

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        reply.raw.write(':heartbeat\n\n');
      } catch {
        // Client disconnected
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Subscribe to all events
    const unsubscribe = eventBus.subscribeAll((event: DomainEvent) => {
      try {
        const eventData = {
          ...event,
          occurredAt: event.occurredAt.toISOString(),
        };
        const data = JSON.stringify(eventData);
        reply.raw.write(`data: ${data}\n\n`);
      } catch {
        // Client disconnected
      }
    });

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
      clients.delete(reply);
    });

    // Send initial connection confirmation
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Don't end the response - keep connection open
    return reply;
  });
}

/**
 * Broadcast a message to all connected SSE clients
 */
export function broadcastToSSEClients(message: Record<string, unknown>): void {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    try {
      client.raw.write(`data: ${data}\n\n`);
    } catch {
      // Client disconnected, will be cleaned up on close
      clients.delete(client);
    }
  });
}

/**
 * Get count of active SSE clients
 */
export function getSSEClientCount(): number {
  return clients.size;
}
