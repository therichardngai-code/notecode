/**
 * CLI API Client
 * Type-safe HTTP client for NoteCode API
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Make an API request to the NoteCode backend
 * @param apiUrl Base URL of the API (e.g., http://localhost:41920)
 * @param path API path (e.g., /api/tasks)
 * @param options Request options
 * @returns Parsed JSON response
 * @throws ApiError on HTTP errors or connection failures
 */
export async function apiRequest<T>(
  apiUrl: string,
  path: string,
  options: ApiRequestOptions = { method: 'GET' }
): Promise<T> {
  const url = `${apiUrl}${path}`;

  try {
    const fetchOptions: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Use status text if JSON parsing fails
      }
      throw new ApiError(errorMessage, response.status);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle connection errors
    if (error instanceof Error) {
      const errorWithCause = error as Error & { cause?: { code?: string } };
      if (errorWithCause.cause?.code === 'ECONNREFUSED') {
        throw new ApiError(
          `Cannot connect to NoteCode server at ${apiUrl}\nIs the server running? Start it with: npx notecode`,
          0,
          'ECONNREFUSED'
        );
      }
      throw new ApiError(error.message, 0);
    }

    throw new ApiError('Unknown error occurred', 0);
  }
}

/**
 * GET request helper
 */
export async function get<T>(apiUrl: string, path: string): Promise<T> {
  return apiRequest<T>(apiUrl, path, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function post<T>(
  apiUrl: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  return apiRequest<T>(apiUrl, path, { method: 'POST', body });
}

/**
 * PATCH request helper
 */
export async function patch<T>(
  apiUrl: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return apiRequest<T>(apiUrl, path, { method: 'PATCH', body });
}

/**
 * DELETE request helper
 */
export async function del<T>(apiUrl: string, path: string): Promise<T> {
  return apiRequest<T>(apiUrl, path, { method: 'DELETE' });
}
