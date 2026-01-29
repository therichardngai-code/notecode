/**
 * YOLO Mode Toggle
 * Settings toggle for auto-approve mode - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

export function YoloModeToggle() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [yoloMode, setYoloMode] = useState(false);
  const [autoExtractSummary, setAutoExtractSummary] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setYoloMode(settings.yoloMode ?? false);
      setAutoExtractSummary(settings.autoExtractSummary ?? false);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({ yoloMode, autoExtractSummary });
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
      {/* YOLO Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">YOLO Mode</h3>
          <p className="text-sm text-muted-foreground">
            When enabled, automatically approves all tool executions without requiring manual
            approval. Use with caution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setYoloMode(!yoloMode);
              setHasChanges(true);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              yoloMode ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                yoloMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-foreground">
            {yoloMode ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {yoloMode && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠ Warning: YOLO mode is enabled. AI agents can execute commands without your approval.
            </p>
          </div>
        )}
      </div>

      {/* Auto Extract Summary */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Auto Extract Summary</h3>
          <p className="text-sm text-muted-foreground">
            Automatically extract and save task summaries from session conversations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAutoExtractSummary(!autoExtractSummary);
              setHasChanges(true);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoExtractSummary ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoExtractSummary ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-foreground">
            {autoExtractSummary ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-4">
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
