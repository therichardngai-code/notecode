/**
 * SSE Handlers Module
 * Exports Server-Sent Events handlers
 */

export {
  registerNotificationSSE,
  broadcastToSSEClients,
  getSSEClientCount,
} from './notification-sse.handler.js';
