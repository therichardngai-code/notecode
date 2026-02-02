/**
 * CLI Hooks List
 * Displays existing hooks in database with actions (edit, sync, delete)
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Upload, Loader2, ToggleLeft, ToggleRight, Edit2, Plus } from 'lucide-react';
import { cliHooksApi, type CliProvider, type CliHookScope, type CliHook } from '@/adapters/api/cli-hooks-api';

interface Props {
  provider: CliProvider;
  scope: CliHookScope;
  projectId?: string;
  onEditHook?: (hook: CliHook) => void;
  onNewHook?: () => void;
}

export function CliHooksList({ provider, scope, projectId, onEditHook, onNewHook }: Props) {
  const [hooks, setHooks] = useState<CliHook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  /** Fetch hooks from API */
  const fetchHooks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cliHooksApi.list({
        provider,
        scope,
        projectId: scope === 'project' ? projectId : undefined,
      });
      setHooks(result.hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hooks');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchHooks();
  }, [provider, scope, projectId]);

  /** Sync single hook to filesystem */
  const handleSync = async (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    try {
      await cliHooksApi.sync(id);
      await fetchHooks(); // Refresh to update syncedAt
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /** Sync all hooks */
  const handleSyncAll = async () => {
    setSyncingIds(new Set(hooks.map((h) => h.id)));
    try {
      await cliHooksApi.syncAll(scope === 'project' ? projectId : undefined);
      await fetchHooks();
    } catch (err) {
      console.error('Sync all failed:', err);
    } finally {
      setSyncingIds(new Set());
    }
  };

  /** Delete hook */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hook?')) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await cliHooksApi.delete(id);
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /** Toggle enabled status */
  const handleToggleEnabled = async (hook: CliHook) => {
    setTogglingIds((prev) => new Set(prev).add(hook.id));
    try {
      await cliHooksApi.update(hook.id, { enabled: !hook.enabled });
      setHooks((prev) =>
        prev.map((h) => (h.id === hook.id ? { ...h, enabled: !h.enabled } : h))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(hook.id);
        return next;
      });
    }
  };

  /** Format sync status */
  const formatSyncStatus = (syncedAt: string | null, updatedAt: string) => {
    if (!syncedAt) return 'Never synced';
    const synced = new Date(syncedAt);
    const updated = new Date(updatedAt);
    if (updated > synced) return 'Out of sync';
    return `Synced ${formatRelativeTime(synced)}`;
  };

  /** Format relative time */
  const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
        <button onClick={fetchHooks} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border">
        <h4 className="font-medium text-foreground">
          Existing Hooks ({hooks.length})
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHooks}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {hooks.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingIds.size > 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Sync All
            </button>
          )}
          {onNewHook && (
            <button
              onClick={onNewHook}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" />
              New Hook
            </button>
          )}
        </div>
      </div>

      {/* Hooks Table */}
      {hooks.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No hooks found. Use "Scan Filesystem" to import existing hooks.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {hooks.map((hook) => {
            const isSyncing = syncingIds.has(hook.id);
            const isDeleting = deletingIds.has(hook.id);
            const isToggling = togglingIds.has(hook.id);
            const syncStatus = formatSyncStatus(hook.syncedAt, hook.updatedAt);
            const isOutOfSync = syncStatus === 'Out of sync' || syncStatus === 'Never synced';

            return (
              <div
                key={hook.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Enable Toggle */}
                <button
                  onClick={() => handleToggleEnabled(hook)}
                  disabled={isToggling}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  title={hook.enabled ? 'Disable' : 'Enable'}
                >
                  {isToggling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : hook.enabled ? (
                    <ToggleRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>

                {/* Hook Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm ${!hook.enabled && 'text-muted-foreground'}`}>
                      {hook.name}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-muted rounded">{hook.hookType}</span>
                  </div>
                  <div className={`text-xs mt-0.5 ${isOutOfSync ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {syncStatus}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {onEditHook && (
                    <button
                      onClick={() => onEditHook(hook)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSync(hook.id)}
                    disabled={isSyncing}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-50"
                    title="Sync to filesystem"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(hook.id)}
                    disabled={isDeleting}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
