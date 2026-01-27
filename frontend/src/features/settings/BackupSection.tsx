/**
 * Backup Section
 * Settings section for data export/backup
 */

import { useState } from 'react';
import { backupApi } from '@/adapters/api/backup-api';
import { Download, Loader2, HardDrive } from 'lucide-react';

export function BackupSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportAll = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await backupApi.exportAll();
      const filename = `notecode-backup-${new Date().toISOString().split('T')[0]}.json`;
      backupApi.downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Data Backup</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Export your projects, tasks, sessions, and messages to a JSON file for backup or migration.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleExportAll}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isExporting ? 'Exporting...' : 'Export All Data'}
      </button>
    </div>
  );
}
