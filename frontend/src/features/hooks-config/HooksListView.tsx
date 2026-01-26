import { useState, useEffect } from 'react';
import type { Hook } from '../../domain/value-objects';

interface HooksListViewProps {
  onEdit: (hook: Hook) => void;
  onDelete: (hookId: string) => void;
  onCreate: () => void;
}

export function HooksListView({ onEdit, onDelete, onCreate }: HooksListViewProps) {
  const [hooks, setHooks] = useState<Hook[]>([]);

  useEffect(() => {
    // TODO: Load from hook repository
    const stored = localStorage.getItem('hooks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHooks(parsed.map((h: Hook) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
        })));
      } catch (e) {
        console.error('Failed to load hooks', e);
      }
    }
  }, []);

  const handleToggleEnabled = (hook: Hook) => {
    const updated = hooks.map((h) =>
      h.id === hook.id ? { ...h, enabled: !h.enabled, updatedAt: new Date() } : h
    );
    setHooks(updated);
    localStorage.setItem('hooks', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Hooks Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure hooks to customize AI agent behavior at different lifecycle events.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Hook
        </button>
      </div>

      {hooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No hooks configured yet.</p>
          <button
            onClick={onCreate}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first hook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((hook) => (
            <div
              key={hook.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{hook.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                      {hook.event}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {hook.type}
                    </span>
                  </div>
                  {hook.description && (
                    <p className="text-sm text-gray-600 mt-1">{hook.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Providers: {hook.providers.join(', ')}</span>
                    <span>Updated: {hook.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleEnabled(hook)}
                    className={`px-3 py-1 text-sm rounded ${
                      hook.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {hook.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => onEdit(hook)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(hook.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
