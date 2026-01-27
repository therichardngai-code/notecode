/**
 * Backup API
 * HTTP client for backup/export endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types
export interface ExportOptions {
  includeProjects?: boolean;
  includeTasks?: boolean;
  includeSessions?: boolean;
  includeMessages?: boolean;
  projectIds?: string[];
  dateRange?: { from: string; to: string };
}

/**
 * Backup API methods
 * Note: Uses direct fetch for blob responses (not apiClient)
 */
export const backupApi = {
  /** Export all data as JSON blob */
  exportAll: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/backup/export`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  /** Export with custom options */
  exportWithOptions: async (options: ExportOptions): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/backup/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  /** Download blob as file */
  downloadBlob: (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
