/**
 * NoteCode CLI - API Client
 * Communicates with the NoteCode REST API
 */

const API_BASE = process.env.NOTECODE_API_URL || 'http://localhost:41920';

/**
 * Make an API request
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g., '/api/tasks')
 * @param {object} body - Request body (for POST/PATCH)
 * @returns {Promise<object>} - API response
 */
async function request(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NoteCode server. Is it running on http://localhost:41920?');
    }
    throw err;
  }
}

// Task API
export async function listTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.search) params.set('search', filters.search);
  
  const query = params.toString();
  return request('GET', `/api/tasks${query ? '?' + query : ''}`);
}

export async function getTask(id) {
  return request('GET', `/api/tasks/${id}`);
}

export async function createTask(data) {
  return request('POST', '/api/tasks', data);
}

export async function updateTask(id, data) {
  return request('PATCH', `/api/tasks/${id}`, data);
}

// Session API
export async function listSessions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.taskId) params.set('taskId', filters.taskId);
  if (filters.limit) params.set('limit', filters.limit.toString());
  
  const query = params.toString();
  return request('GET', `/api/sessions${query ? '?' + query : ''}`);
}

export async function getSession(id) {
  return request('GET', `/api/sessions/${id}`);
}

export async function listRunningSessions() {
  return request('GET', '/api/sessions/running');
}

// Approval API
export async function listPendingApprovals() {
  return request('GET', '/api/approvals/pending');
}

export async function getApproval(id) {
  return request('GET', `/api/approvals/${id}`);
}

export async function approveApproval(id, message) {
  return request('POST', `/api/approvals/${id}/approve`, { decidedBy: message || 'cli' });
}

export async function rejectApproval(id, reason) {
  return request('POST', `/api/approvals/${id}/reject`, { decidedBy: reason || 'cli' });
}

export async function listApprovalsBySession(sessionId) {
  return request('GET', `/api/approvals/session/${sessionId}`);
}

export async function getApprovalStatus(id) {
  return request('GET', `/api/approvals/${id}/status`);
}
