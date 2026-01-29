/**
 * Default Model Section
 * Settings for default AI provider and model - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { modelsByProvider, modelOptions } from '@/shared/config/property-config';
import type { ProviderType } from '../../domain/entities';

export function DefaultModelSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [provider, setProvider] = useState<ProviderType>('anthropic');
  const [model, setModel] = useState('sonnet');
  const [fallbackModel, setFallbackModel] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setProvider(settings.defaultProvider || 'anthropic');
      setModel(settings.defaultModel || 'sonnet');
      setFallbackModel(settings.fallbackModel || '');
    }
  }, [settings]);

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const defaultModel = modelsByProvider[newProvider]?.[0]?.id || 'sonnet';
    setModel(defaultModel);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate({
      defaultProvider: provider,
      defaultModel: model,
      fallbackModel: fallbackModel || undefined,
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

  const currentModels = modelsByProvider[provider] || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Default Model</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the default AI provider and model for new tasks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-foreground mb-1">
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="google">Gemini (Google)</option>
            <option value="openai">Codex (OpenAI)</option>
          </select>
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-foreground mb-1">
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {currentModels.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fallbackModel" className="block text-sm font-medium text-foreground mb-1">
          Fallback Model (optional)
        </label>
        <select
          id="fallbackModel"
          value={fallbackModel}
          onChange={(e) => {
            setFallbackModel(e.target.value);
            setHasChanges(true);
          }}
          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">None</option>
          {modelOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Used when the primary model fails or is unavailable.
        </p>
      </div>

      <div className="flex items-center gap-3">
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
