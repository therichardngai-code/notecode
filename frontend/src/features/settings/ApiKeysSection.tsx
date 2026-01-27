/**
 * API Keys Section
 * Settings section for managing provider API keys
 */

import { useState } from 'react';
import { useSettings, useSetApiKey, useRemoveApiKey, useEncryptionStatus } from '@/shared/hooks/use-settings';
import { Lock, Key, Loader2 } from 'lucide-react';
import type { ProviderType } from '../../domain/entities';

interface ApiKeyInputProps {
  provider: ProviderType;
  hasKey: boolean;
  onSave: (key: string) => void;
  onDelete: () => void;
  isSaving?: boolean;
}

function ApiKeyInput({ provider, hasKey, onSave, onDelete, isSaving }: ApiKeyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      setInputValue('');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInputValue('');
    setIsEditing(false);
  };

  const providerNames: Record<ProviderType, string> = {
    anthropic: 'Anthropic (Claude)',
    google: 'Google (Gemini)',
    openai: 'OpenAI (GPT)',
  };

  const providerIcons: Record<ProviderType, string> = {
    anthropic: '🅰️',
    google: '🔷',
    openai: '🤖',
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{providerIcons[provider]}</span>
          <h3 className="font-medium text-foreground">{providerNames[provider]}</h3>
        </div>
        {hasKey && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            <Key className="w-3 h-3" />
            Configured
          </span>
        )}
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-muted rounded border border-border font-mono text-sm text-muted-foreground">
            {hasKey ? '••••••••••••••••' : 'Not configured'}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            disabled={isSaving}
            className="px-4 py-2 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
          >
            {hasKey ? 'Update' : 'Add'}
          </button>
          {hasKey && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Enter ${providerNames[provider]} API key`}
            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!inputValue.trim() || isSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiKeysSection() {
  const { data: settings, isLoading } = useSettings();
  const { data: encryptionStatus } = useEncryptionStatus();
  const setApiKeyMutation = useSetApiKey();
  const removeApiKeyMutation = useRemoveApiKey();

  const handleSave = (provider: ProviderType, key: string) => {
    setApiKeyMutation.mutate({ provider, apiKey: key });
  };

  const handleDelete = (provider: ProviderType) => {
    removeApiKeyMutation.mutate(provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const providers: ProviderType[] = ['anthropic', 'google', 'openai'];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">API Keys</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure API keys for different AI providers. Keys are stored securely and never sent to
          external servers except the respective AI provider.
        </p>
      </div>

      {encryptionStatus?.configured && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Lock className="w-4 h-4" />
          <span>API keys are encrypted at rest</span>
        </div>
      )}

      <div className="space-y-3">
        {providers.map((provider) => (
          <ApiKeyInput
            key={provider}
            provider={provider}
            hasKey={settings?.apiKeys?.[provider] ?? false}
            onSave={(key) => handleSave(provider, key)}
            onDelete={() => handleDelete(provider)}
            isSaving={setApiKeyMutation.isPending || removeApiKeyMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
