import { useState, lazy, Suspense } from 'react';
import type { Hook, HookEvent, HookType } from '../../domain/value-objects';
import type { ProviderType } from '../../domain/entities';
import { LoadingSpinner } from '@/shared/components/common';

// Lazy load Monaco - only loads when HookEditor is rendered
const Editor = lazy(() => import('@monaco-editor/react').then(mod => ({ default: mod.default })));

interface HookEditorProps {
  hook?: Hook;
  onSave: (data: HookFormData) => void;
  onCancel: () => void;
}

export interface HookFormData {
  name: string;
  description?: string;
  enabled: boolean;
  event: HookEvent;
  type: HookType;
  script?: string;
  providers: ProviderType[];
}

const hookEvents: HookEvent[] = [
  'session:start',
  'session:end',
  'message:before',
  'message:after',
  'tool:before',
  'tool:after',
  'approval:pending',
];

const hookTypes: HookType[] = ['script', 'memory-inject', 'context-inject'];

export function HookEditor({ hook, onSave, onCancel }: HookEditorProps) {
  const [formData, setFormData] = useState<HookFormData>({
    name: hook?.name || '',
    description: hook?.description || '',
    enabled: hook?.enabled ?? true,
    event: hook?.event || 'tool:before',
    type: hook?.type || 'script',
    script: hook?.script || '// Write your hook script here\n',
    providers: hook?.providers || ['anthropic', 'google', 'openai'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleProviderToggle = (provider: ProviderType) => {
    setFormData((prev) => ({
      ...prev,
      providers: prev.providers.includes(provider)
        ? prev.providers.filter((p) => p !== provider)
        : [...prev.providers, provider],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Hook Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="event" className="block text-sm font-medium text-foreground mb-1">
            Event *
          </label>
          <select
            id="event"
            value={formData.event}
            onChange={(e) => setFormData({ ...formData, event: e.target.value as HookEvent })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hookEvents.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">
            Type *
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as HookType })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hookTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Providers</label>
          <div className="flex gap-3 items-center h-10">
            {(['anthropic', 'google', 'openai'] as ProviderType[]).map((provider) => (
              <label key={provider} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.providers.includes(provider)}
                  onChange={() => handleProviderToggle(provider)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-foreground capitalize">{provider}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {formData.type === 'script' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Script</label>
          <div className="border border-input rounded-md bg-background overflow-hidden">
            <Suspense fallback={<div className="h-[300px] flex items-center justify-center"><LoadingSpinner /></div>}>
              <Editor
                height="300px"
                defaultLanguage="javascript"
                value={formData.script}
                onChange={(value) => setFormData({ ...formData, script: value || '' })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enabled" className="text-sm text-foreground">
          Enable this hook
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          {hook ? 'Update Hook' : 'Create Hook'}
        </button>
      </div>
    </form>
  );
}
