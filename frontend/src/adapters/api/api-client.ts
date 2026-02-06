/**
 * API Client
 * Base HTTP client for backend communication
 *
 * Dev mode: Uses localhost:3001 (separate backend)
 * Prod mode: Uses relative URLs (same-origin)
 * Electron: Uses dynamic URL from main process
 */

import { getApiBaseUrl, setApiBaseUrl } from '@/shared/lib/api-config';

// ElectronAPI type is declared globally in use-electron.ts

// Listen for Electron dynamic port and update the centralized base URL
if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.onBackendUrl((url: string) => {
    setApiBaseUrl(url);
  });
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Build URL with query parameters
 * Handles both absolute URLs (dev/Electron) and relative URLs (prod)
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const apiBaseUrl = getApiBaseUrl();
  // For relative URLs (prod mode), use current origin as base
  const baseUrl = apiBaseUrl || window.location.origin;
  const url = new URL(`${baseUrl}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  // Return relative path if no base URL (prod mode)
  return apiBaseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * Base fetch wrapper with error handling
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Pass entire error response as details to preserve warnings array
    throw new ApiError(response.status, error.error || 'Request failed', error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * API client methods
 */
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export default apiClient;
