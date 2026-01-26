import { useState, useEffect } from 'react';
import type { ProviderType } from '../../domain/entities';

interface ApiKeyInputProps {
  provider: ProviderType;
  value: string;
  onSave: (provider: ProviderType, key: string) => void;
  onDelete: (provider: ProviderType) => void;
}

function ApiKeyInput({ provider, value, onSave, onDelete }: ApiKeyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  const hasKey = value && value.length > 0;

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(provider, inputValue.trim());
      setInputValue('');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInputValue('');
    setIsEditing(false);
  };

  const displayValue = hasKey
    ? showKey
      ? value
      : '•'.repeat(Math.min(value.length, 32))
    : 'Not set';

  const providerNames: Record<ProviderType, string> = {
    anthropic: 'Anthropic (Claude)',
    google: 'Google (Gemini)',
    openai: 'OpenAI (GPT)',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{providerNames[provider]}</h3>
        {hasKey && (
          <button
            onClick={() => setShowKey(!showKey)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 font-mono text-sm">
            {displayValue}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            {hasKey ? 'Update' : 'Add'}
          </button>
          {hasKey && (
            <button
              onClick={() => onDelete(provider)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              Delete
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
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
  const [apiKeys, setApiKeys] = useState<Record<ProviderType, string>>({
    anthropic: '',
    google: '',
    openai: '',
  });

  useEffect(() => {
    // TODO: Load from settings repository
    const stored = localStorage.getItem('apiKeys');
    if (stored) {
      try {
        setApiKeys(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load API keys', e);
      }
    }
  }, []);

  const handleSave = (provider: ProviderType, key: string) => {
    const updated = { ...apiKeys, [provider]: key };
    setApiKeys(updated);
    localStorage.setItem('apiKeys', JSON.stringify(updated));
  };

  const handleDelete = (provider: ProviderType) => {
    const updated = { ...apiKeys, [provider]: '' };
    setApiKeys(updated);
    localStorage.setItem('apiKeys', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">API Keys</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure API keys for different AI providers. Keys are stored securely and never sent to
          external servers except the respective AI provider.
        </p>
      </div>

      <div className="space-y-3">
        <ApiKeyInput
          provider="anthropic"
          value={apiKeys.anthropic}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ApiKeyInput
          provider="google"
          value={apiKeys.google}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ApiKeyInput
          provider="openai"
          value={apiKeys.openai}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
