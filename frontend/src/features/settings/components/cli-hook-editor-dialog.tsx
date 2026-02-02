/**
 * CLI Hook Editor Dialog
 * Monaco editor dialog for creating/editing hook scripts
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { X, Save, Upload, FileCode, Loader2 } from 'lucide-react';
import { cliHooksApi, type CliProvider, type CliHookScope, type CliHook, type HookTemplate } from '@/adapters/api/cli-hooks-api';
import { LoadingSpinner } from '@/shared/components/common';

// Lazy load Monaco Editor
const Editor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.default })));

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  provider: CliProvider;
  scope: CliHookScope;
  projectId?: string;
  hook?: CliHook; // If editing existing hook
}

// Claude hook types (others can be added later)
const HOOK_TYPES: Record<CliProvider, string[]> = {
  claude: ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SessionStart', 'SessionEnd', 'UserPromptSubmit'],
  gemini: ['PreToolUse', 'PostToolUse', 'PrePrompt', 'PostPrompt'],
  codex: ['PreToolUse', 'PostToolUse', 'PreExec', 'PostExec'],
};

// Available tools for matcher (same as Claude's tool list)
const AVAILABLE_TOOLS = [
  'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash',
  'NotebookEdit', 'WebSearch', 'WebFetch',
  'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet',
] as const;

// Common matcher presets
const MATCHER_PRESETS = [
  { label: 'All file changes', value: 'Write|Edit|NotebookEdit|Bash' },
  { label: 'File writes only', value: 'Write|Edit' },
  { label: 'Shell commands', value: 'Bash' },
  { label: 'Task operations', value: 'TaskCreate|TaskUpdate' },
];

const DEFAULT_SCRIPT = `/**
 * Hook Script
 * @param {Object} context - Hook context from CLI
 * @returns {Object} Hook response
 */
module.exports = async (context) => {
  // Your hook logic here
  console.log('Hook executed:', context);

  return {
    // For PreToolUse: return { decision: 'allow' | 'deny' | 'ask' }
    // For PostToolUse: return { message: 'optional message' }
  };
};
`;

export function CliHookEditorDialog({ isOpen, onClose, onSave, provider, scope, projectId, hook }: Props) {
  const isEditing = !!hook;

  // Form state
  const [name, setName] = useState(hook?.name || '');
  const [hookType, setHookType] = useState(hook?.hookType || HOOK_TYPES[provider][0]);
  const [script, setScript] = useState(hook?.script || DEFAULT_SCRIPT);
  const [enabled, setEnabled] = useState(hook?.enabled ?? true);
  const [matcher, setMatcher] = useState(hook?.matcher || '');
  const [timeout, setTimeout] = useState<string>(hook?.timeout?.toString() || '');

  // Templates state
  const [templates, setTemplates] = useState<HookTemplate[]>([]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      loadTemplates();
    }
  }, [isOpen, provider]);

  // Reset form when hook changes
  useEffect(() => {
    if (hook) {
      setName(hook.name);
      setHookType(hook.hookType);
      setScript(hook.script);
      setEnabled(hook.enabled);
      setMatcher(hook.matcher || '');
      setTimeout(hook.timeout?.toString() || '');
    } else {
      setName('');
      setHookType(HOOK_TYPES[provider][0]);
      setScript(DEFAULT_SCRIPT);
      setEnabled(true);
      setMatcher('');
      setTimeout('');
    }
    setError(null);
  }, [hook, provider]);

  const loadTemplates = async () => {
    try {
      const result = await cliHooksApi.getTemplates(provider);
      setTemplates(result.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleLoadTemplate = (template: HookTemplate) => {
    setName(template.name);
    setHookType(template.hookType);
    setScript(template.script);
  };

  const validateName = (value: string): boolean => {
    // Must be kebab-case
    return /^[a-z][a-z0-9-]*$/.test(value);
  };

  const handleSave = async (andSync: boolean = false) => {
    // Validate
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!validateName(name)) {
      setError('Name must be kebab-case (e.g., my-hook-name)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let savedHook: CliHook;

      const timeoutNum = timeout ? parseInt(timeout, 10) : null;
      const matcherVal = matcher.trim() || null;

      if (isEditing && hook) {
        // Update existing
        savedHook = await cliHooksApi.update(hook.id, {
          name,
          hookType,
          script,
          enabled,
          matcher: matcherVal,
          timeout: timeoutNum,
        });
      } else {
        // Create new
        savedHook = await cliHooksApi.create({
          projectId: scope === 'project' ? projectId : null,
          provider,
          name,
          hookType,
          script,
          enabled,
          scope,
          matcher: matcherVal,
          timeout: timeoutNum,
        });
      }

      // Sync to filesystem if requested
      if (andSync) {
        setIsSyncing(true);
        await cliHooksApi.sync(savedHook.id);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {isEditing ? `Edit Hook: ${hook.name}` : 'Create New Hook'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name & Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Hook Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="my-hook-name"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">kebab-case only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Hook Type *
              </label>
              <select
                value={hookType}
                onChange={(e) => setHookType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {HOOK_TYPES[provider].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="enabled" className="text-sm text-foreground">
              Enable this hook
            </label>
          </div>

          {/* Matcher & Timeout (only for PreToolUse) */}
          {hookType === 'PreToolUse' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              {/* Matcher */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Matcher (optional)
                </label>
                <input
                  type="text"
                  value={matcher}
                  onChange={(e) => setMatcher(e.target.value)}
                  placeholder="e.g., Write|Edit|Bash"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tool names separated by | (e.g., Write|Edit|Bash)
                </p>
                {/* Presets */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {MATCHER_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setMatcher(preset.value)}
                      className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {/* Available tools */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {AVAILABLE_TOOLS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => {
                        const current = matcher.split('|').filter(Boolean);
                        if (current.includes(tool)) {
                          setMatcher(current.filter((t) => t !== tool).join('|'));
                        } else {
                          setMatcher([...current, tool].join('|'));
                        }
                      }}
                      className={`px-2 py-0.5 text-xs rounded ${
                        matcher.split('|').includes(tool)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeout */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Timeout (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(e.target.value)}
                    placeholder="1800"
                    min="0"
                    className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max execution time (e.g., 1800 = 30 min)
                </p>
              </div>
            </div>
          )}

          {/* Template Selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Load Template
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleLoadTemplate(template)}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-muted/80"
                    title={template.description}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Script Editor */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Script
            </label>
            <div className="border border-border rounded-md overflow-hidden">
              <Suspense
                fallback={
                  <div className="h-[400px] flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                }
              >
                <Editor
                  height="400px"
                  defaultLanguage="javascript"
                  value={script}
                  onChange={(value) => setScript(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </Suspense>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Provider: {provider} | Scope: {scope}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && !isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Save & Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
