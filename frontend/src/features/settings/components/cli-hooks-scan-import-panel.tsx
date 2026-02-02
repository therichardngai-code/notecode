/**
 * CLI Hooks Scan/Import Panel
 * Scans filesystem for hooks and allows importing to database
 */

import { useState, lazy, Suspense } from 'react';
import { Search, Download, AlertTriangle, Check, Loader2, Eye } from 'lucide-react';
import { cliHooksApi, type CliProvider, type CliHookScope, type ScannedHook, type ImportResult } from '@/adapters/api/cli-hooks-api';
import { LoadingSpinner } from '@/shared/components/common';

// Lazy load DiffEditor for collision view
const DiffEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor }))
);

interface Props {
  provider: CliProvider;
  scope: CliHookScope;
  projectId?: string;
  projectPath?: string;
  onImportComplete?: () => void;
}

type HookStatus = 'new' | 'exists-same' | 'exists-changed' | 'db-only' | 'unknown';

/** Determine status from scanned hook data */
function getHookStatus(hook: ScannedHook): HookStatus {
  if (hook.inFs && !hook.inDb) return 'new';
  if (hook.inFs && hook.inDb && hook.differs === false) return 'exists-same';
  if (hook.inFs && hook.inDb && hook.differs === true) return 'exists-changed';
  if (!hook.inFs && hook.inDb) return 'db-only';
  return 'unknown';
}

/** Status badge component */
function StatusBadge({ status }: { status: HookStatus }) {
  const config = {
    new: { label: 'New', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    'exists-same': { label: 'Exists-Same', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    'exists-changed': { label: 'Exists-Changed', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    'db-only': { label: 'DB Only', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    unknown: { label: 'Unknown', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  }[status];

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export function CliHooksScanImportPanel({ provider, scope, projectId, projectPath, onImportComplete }: Props) {
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedHooks, setScannedHooks] = useState<ScannedHook[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Selection state - pre-select 'new' and 'exists-changed'
  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(new Set());

  // Diff dialog state
  const [diffHook, setDiffHook] = useState<{ name: string; dbContent: string; fsContent: string } | null>(null);

  /** Scan filesystem for hooks */
  const handleScan = async () => {
    if (scope === 'project' && !projectPath) {
      setScanError('Please select a project first');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScannedHooks([]);
    setSelectedHooks(new Set());
    setImportResult(null);

    try {
      const result = await cliHooksApi.scan({
        provider,
        projectPath: projectPath || undefined,
        projectId: projectId || undefined,
      });

      setScannedHooks(result.hooks);

      // Pre-select importable hooks (new + exists-changed)
      const preSelected = new Set<string>();
      result.hooks.forEach((hook) => {
        const status = getHookStatus(hook);
        if (status === 'new' || status === 'exists-changed') {
          preSelected.add(hook.name);
        }
      });
      setSelectedHooks(preSelected);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  /** Import selected hooks */
  const handleImport = async () => {
    if (selectedHooks.size === 0) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await cliHooksApi.import({
        provider,
        projectPath: projectPath || undefined,
        projectId: projectId || undefined,
        updateExisting: true,
      });

      setImportResult(result);
      onImportComplete?.();

      // Clear scan results after successful import
      if (result.errors.length === 0) {
        setScannedHooks([]);
        setSelectedHooks(new Set());
      }
    } catch (err) {
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      });
    } finally {
      setIsImporting(false);
    }
  };

  /** View diff for a changed hook */
  const handleViewDiff = async (hook: ScannedHook) => {
    if (!hook.dbHookId) return;

    try {
      const diff = await cliHooksApi.getDiff(hook.dbHookId);
      setDiffHook({
        name: hook.name,
        dbContent: diff.dbContent,
        fsContent: diff.fsContent || '',
      });
    } catch (err) {
      console.error('Failed to get diff:', err);
    }
  };

  /** Toggle hook selection */
  const toggleSelection = (hookName: string) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(hookName)) {
        next.delete(hookName);
      } else {
        next.add(hookName);
      }
      return next;
    });
  };

  const importableCount = scannedHooks.filter((h) => {
    const status = getHookStatus(h);
    return status === 'new' || status === 'exists-changed';
  }).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Download className="w-4 h-4" />
          Import Hooks from Filesystem
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Scan {scope === 'project' ? 'project' : 'global'} hooks directory and import to database
        </p>
      </div>

      {/* Scan Button */}
      <div className="p-4 border-b border-border">
        <button
          onClick={handleScan}
          disabled={isScanning || (scope === 'project' && !projectPath)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isScanning ? 'Scanning...' : 'Scan Filesystem'}
        </button>

        {scanError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {scanError}
          </p>
        )}
      </div>

      {/* Scanned Hooks List */}
      {scannedHooks.length > 0 && (
        <div className="p-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            Found {scannedHooks.length} hooks ({importableCount} importable)
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scannedHooks.map((hook) => {
              const status = getHookStatus(hook);
              const isDisabled = status === 'exists-same' || status === 'db-only';
              const isSelected = selectedHooks.has(hook.name);

              return (
                <div
                  key={hook.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isDisabled ? 'bg-muted/30 border-border' : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggleSelection(hook.name)}
                    className="w-4 h-4 text-primary rounded disabled:opacity-50"
                  />

                  {/* Hook Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{hook.name}.cjs</span>
                      {hook.hookType === 'Unknown' && (
                        <span title="Unknown hook type"><AlertTriangle className="w-4 h-4 text-orange-500" /></span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {hook.hookType}
                      {hook.matcher && ` • Matcher: ${hook.matcher}`}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <StatusBadge status={status} />

                  {/* View Diff Button (for exists-changed) */}
                  {status === 'exists-changed' && (
                    <button
                      onClick={() => handleViewDiff(hook)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                      title="View diff"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={isImporting || selectedHooks.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isImporting ? 'Importing...' : `Import Selected (${selectedHooks.size})`}
          </button>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`p-4 border-t border-border ${importResult.errors.length > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
          <div className="flex items-center gap-2 text-sm">
            {importResult.errors.length === 0 ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  Imported {importResult.imported}, Updated {importResult.updated}, Skipped {importResult.skipped}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 dark:text-red-400">
                  {importResult.errors.join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Diff Dialog */}
      {diffHook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                Diff: {diffHook.name}.cjs
              </h3>
              <button
                onClick={() => setDiffHook(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                ✕
              </button>
            </div>

            {/* Diff Labels */}
            <div className="flex px-4 pt-2 text-xs text-muted-foreground">
              <div className="flex-1">Database Version</div>
              <div className="flex-1">Filesystem Version</div>
            </div>

            {/* Diff Editor */}
            <div className="flex-1 min-h-[400px] p-4">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingSpinner /></div>}>
                <DiffEditor
                  height="100%"
                  original={diffHook.dbContent}
                  modified={diffHook.fsContent}
                  language="javascript"
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                  }}
                />
              </Suspense>
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setDiffHook(null)}
                className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
