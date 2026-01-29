/**
 * Data Retention Settings
 * Configure auto-delete of old tasks - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

export function DataRetentionSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(90);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setEnabled(settings.dataRetentionEnabled ?? false);
      setDays(settings.dataRetentionDays ?? 90);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      dataRetentionEnabled: enabled,
      dataRetentionDays: days,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">Data Retention</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Automatically delete tasks that haven't been updated for a specified number of days.
        Sessions and messages are also deleted.
      </p>

      {/* Enable Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setEnabled(!enabled);
            setHasChanges(true);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-foreground">
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {/* Days Input */}
      {enabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Delete tasks older than
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value) || 90);
                setHasChanges(true);
              }}
              className="w-20 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>
      )}

      {enabled && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠ Tasks inactive for more than {days} days will be permanently deleted on server startup.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Save Changes'
          )}
        </button>
        {updateSettings.isSuccess && !hasChanges && (
          <span className="text-green-600 text-sm">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
