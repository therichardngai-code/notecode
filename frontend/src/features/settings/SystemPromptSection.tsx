/**
 * System Prompt Section
 * Settings for global system prompt - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

export function SystemPromptSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setSystemPrompt(settings.systemPrompt || '');
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      systemPrompt: systemPrompt || undefined,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          <MessageSquare className="w-5 h-5 inline mr-2" />
          Global System Prompt
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define a global system prompt that will be prepended to all AI sessions.
          Project-level prompts will override this setting.
        </p>
      </div>

      <div>
        <label htmlFor="systemPrompt" className="block text-sm font-medium text-foreground mb-1">
          System Prompt
        </label>
        <textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            setHasChanges(true);
          }}
          placeholder="Enter your global system prompt..."
          rows={6}
          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use this to set global instructions, coding standards, or preferences for all AI agents.
        </p>
      </div>

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
