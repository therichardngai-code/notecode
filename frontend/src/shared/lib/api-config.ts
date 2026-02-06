/**
 * Runtime configuration for API endpoints
 *
 * Dev mode: Uses explicit localhost:41920 (separate backend server)
 * Prod mode: Uses relative URLs (same-origin, backend serves frontend)
 * Electron: Dynamic URL injected via IPC from main process
 *
 * IMPORTANT: All URL getters read from the mutable _baseUrl so that
 * Electron's dynamic port override propagates to SSE, WebSocket, and REST.
 */

const isDev = import.meta.env.DEV;

// Check for Electron's backend URL passed as query param (synchronous, no race condition)
function getInitialBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const electronUrl = params.get('backendUrl');
    if (electronUrl) {
      console.log('[api-config] Using Electron backend URL:', electronUrl);
      return electronUrl;
    }
  }
  return isDev ? (import.meta.env.VITE_API_URL || 'http://localhost:41920') : '';
}

const DEFAULT_BASE_URL = getInitialBaseUrl();

// Mutable base URL — updated by Electron IPC via setApiBaseUrl()
let _baseUrl = DEFAULT_BASE_URL;

/** Update base URL at runtime (called by Electron IPC handler) */
export function setApiBaseUrl(url: string) {
  console.log('[api-config] Base URL updated:', url);
  _baseUrl = url;
}

/** Current base URL for REST API calls */
export function getApiBaseUrl(): string {
  return _baseUrl;
}

// Legacy export — points to initial value. Prefer getApiBaseUrl() for dynamic use.
export const API_BASE_URL = DEFAULT_BASE_URL;

/**
 * Get WebSocket base URL based on current environment
 */
export function getWsBaseUrl(): string {
  if (_baseUrl) {
    return _baseUrl.replace(/^http/, 'ws');
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}`;
}

/**
 * Build full API URL from path
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${_baseUrl}${cleanPath}`;
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
  return `${_baseUrl}${cleanPath}`;
}
