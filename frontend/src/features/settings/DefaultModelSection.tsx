import { useState, useEffect } from 'react';
import type { ProviderType } from '../../domain/entities';

interface ModelOption {
  value: string;
  label: string;
}

const modelsByProvider: Record<ProviderType, ModelOption[]> = {
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

export function DefaultModelSection() {
  const [provider, setProvider] = useState<ProviderType>('anthropic');
  const [model, setModel] = useState('claude-3-5-sonnet-20241022');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem('defaultProvider') as ProviderType;
    const storedModel = localStorage.getItem('defaultModel');
    if (storedProvider) setProvider(storedProvider);
    if (storedModel) setModel(storedModel);
  }, []);

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const defaultModel = modelsByProvider[newProvider][0].value;
    setModel(defaultModel);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('defaultProvider', provider);
    localStorage.setItem('defaultModel', model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentModels = modelsByProvider[provider];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Model</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose the default AI provider and model for new tasks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setSaved(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currentModels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
        {saved && <span className="text-green-600 text-sm">✓ Saved successfully</span>}
      </div>
    </div>
  );
}
