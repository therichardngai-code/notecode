/**
 * Terminals API Client
 * Handles terminal creation, listing, and closing
 */

import { apiClient } from './api-client';

export interface TerminalResponse {
  id: string;
  projectId: string;
  shell: string;
  cwd: string;
  pid: number;
  createdAt: string;
  wsUrl: string;
}

export interface ListTerminalsResponse {
  terminals: TerminalResponse[];
  limits: {
    perProject: number;
    total: number;
    currentProject: number;
    currentTotal: number;
  };
}

export interface CreateTerminalOptions {
  shell?: 'bash' | 'zsh' | 'powershell' | 'cmd' | 'sh';
  cols?: number;
  rows?: number;
}

export const terminalsApi = {
  /** Create new terminal for project */
  create: (projectId: string, options?: CreateTerminalOptions) =>
    apiClient.post<TerminalResponse>(
      `/api/projects/${projectId}/terminals`,
      options ?? {}
    ),

  /** List all terminals for project */
  list: (projectId: string) =>
    apiClient.get<ListTerminalsResponse>(
      `/api/projects/${projectId}/terminals`
    ),

  /** Close terminal */
  close: (terminalId: string) =>
    apiClient.delete<{ success: boolean }>(
      `/api/terminals/${terminalId}`
    ),
};
