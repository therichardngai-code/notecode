/**
 * Runtime configuration for API endpoints
 *
 * Dev mode: Uses explicit localhost:41920 (separate backend server)
 * Prod mode: Uses relative URLs (same-origin, backend serves frontend)
 */

const isDev = import.meta.env.DEV;

/**
 * Base URL for REST API calls
 * - Dev: http://localhost:41920
 * - Prod: '' (relative, same-origin)
 */
export const API_BASE_URL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:41920')
  : '';

/**
 * Get WebSocket base URL based on current environment
 * - Dev: ws://localhost:41920
 * - Prod: ws://current-host (dynamic port)
 */
export function getWsBaseUrl(): string {
  if (isDev) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:41920';
    return apiUrl.replace(/^http/, 'ws');
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}`;
}

/**
 * Base URL for SSE connections
 * - Dev: http://localhost:41920
 * - Prod: '' (relative, same-origin)
 */
export const SSE_BASE_URL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:41920')
  : '';

/**
 * Build full API URL from path
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Build full WebSocket URL from path
 */
export function getWsUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWsBaseUrl()}${cleanPath}`;
}

/**
 * Build full SSE URL from path
 */
export function getSseUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SSE_BASE_URL}${cleanPath}`;
}
