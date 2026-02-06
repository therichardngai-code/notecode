/**
 * Git API
 * HTTP client for git integration endpoints
 */

import { apiClient } from './api-client';

// Git commit approval types
export type GitApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DiffSummary {
  files: number;
  additions: number;
  deletions: number;
}

export interface GitCommitApproval {
  id: string;
  taskId: string;
  projectId: string;
  attemptNumber: number;
  status: GitApprovalStatus;
  commitMessage: string;
  filesChanged: string[];
  diffSummary: DiffSummary;
  commitSha: string | null;
  createdAt: string;
  resolvedAt: string | null;
  // Embedded task info (from list endpoint)
  task?: {
    id: string;
    title: string;
    branchName: string | null;
  };
}

export interface FileDiff {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
}

// Task git status response
export interface TaskGitStatus {
  branchName: string | null;
  baseBranch: string | null;
  currentBranch: string;
  isOnTaskBranch: boolean;
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  summary: DiffSummary | null;
  pendingApproval: {
    id: string;
    status: GitApprovalStatus;
    createdAt: string;
  } | null;
}

// Project git branch response (lightweight, never errors)
export interface GitBranchStatus {
  isGitRepo: boolean;
  branch: string | null;
  isDirty: boolean;
}

// Project git status response
export interface ProjectGitStatus {
  currentBranch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  } | null;
  taskBranches: {
    branchName: string;
    taskId: string;
    taskTitle: string;
  }[];
}

// API Response types
interface ApprovalsResponse {
  approvals: GitCommitApproval[];
  total: number;
}

interface ApprovalResponse {
  approval: GitCommitApproval;
  diff?: {
    files: FileDiff[];
  };
}

interface ApproveResponse {
  success: boolean;
  approval: GitCommitApproval;
  commit: {
    sha: string;
    message: string;
  };
}

interface RejectResponse {
  success: boolean;
  approval: GitCommitApproval;
  changesDiscarded: boolean;
  revertResult?: {
    total: number;
    reverted: number;
    failed: number;
    results: Array<{
      diffId: string;
      success: boolean;
      filePath: string;
      operation: string;
    }>;
  };
}

// Task approvals response
interface TaskApprovalsResponse {
  approvals: GitCommitApproval[];
}

/**
 * Git API methods
 */
export const gitApi = {
  /**
   * Get task git status
   */
  getTaskGitStatus: (taskId: string) =>
    apiClient.get<TaskGitStatus>(`/api/tasks/${taskId}/git/status`),

  /**
   * Get git commit approvals for a task
   */
  getTaskApprovals: (taskId: string) =>
    apiClient.get<TaskApprovalsResponse>(`/api/tasks/${taskId}/git/approvals`),

  /**
   * Get project git branch (lightweight, safe to poll)
   */
  getProjectBranch: (projectId: string) =>
    apiClient.get<GitBranchStatus>(`/api/projects/${projectId}/git/branch`),

  /**
   * Get project git status
   */
  getProjectGitStatus: (projectId: string) =>
    apiClient.get<ProjectGitStatus>(`/api/projects/${projectId}/git/status`),

  /**
   * List git commit approvals
   */
  listApprovals: (params: { projectId: string; status?: GitApprovalStatus | 'all' }) =>
    apiClient.get<ApprovalsResponse>('/api/git/approvals', params),

  /**
   * Get single approval with diff
   */
  getApproval: (id: string) =>
    apiClient.get<ApprovalResponse>(`/api/git/approvals/${id}`),

  /**
   * Approve commit
   */
  approveCommit: (id: string, data?: { commitMessage?: string }) =>
    apiClient.post<ApproveResponse>(`/api/git/approvals/${id}/approve`, data || {}),

  /**
   * Reject commit
   */
  rejectCommit: (id: string, data?: { discardChanges?: boolean }) =>
    apiClient.post<RejectResponse>(`/api/git/approvals/${id}/reject`, data || {}),
};
