/**
 * CLI Hooks Section
 * Main container for CLI provider hooks management (Claude, Gemini, Codex)
 * Supports scanning filesystem and importing hooks to database
 */

import { useState, useEffect } from 'react';
import { Terminal, Globe, FolderCode } from 'lucide-react';
import { useSettings } from '@/shared/hooks/use-settings';
import { useProjects } from '@/shared/hooks/use-projects-query';
import type { CliProvider, CliHookScope, CliHook } from '@/adapters/api/cli-hooks-api';
import { CliHooksScanImportPanel } from './components/cli-hooks-scan-import-panel';
import { CliHooksList } from './components/cli-hooks-list';
import { CliHookEditorDialog } from './components/cli-hook-editor-dialog';

const PROVIDERS: { id: CliProvider; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'codex', label: 'Codex' },
];

export function CliHooksSection() {
  const { data: settings } = useSettings();
  const { data: projects = [] } = useProjects();

  // Provider tab state
  const [activeProvider, setActiveProvider] = useState<CliProvider>('claude');

  // Scope state: project or global
  const [scope, setScope] = useState<CliHookScope>('project');

  // Project selector - defaults to active project
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  // Initialize project selection from settings
  useEffect(() => {
    if (settings?.currentActiveProjectId && !selectedProjectId) {
      setSelectedProjectId(settings.currentActiveProjectId);
    }
  }, [settings?.currentActiveProjectId, selectedProjectId]);

  // Get selected project details
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectPath = scope === 'project' ? selectedProject?.path : undefined;

  // Refresh trigger for hooks list after import
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Editor dialog state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHook, setEditingHook] = useState<CliHook | undefined>();

  const handleNewHook = () => {
    setEditingHook(undefined);
    setIsEditorOpen(true);
  };

  const handleEditHook = (hook: CliHook) => {
    setEditingHook(hook);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingHook(undefined);
  };

  const handleEditorSave = () => {
    triggerRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">CLI Provider Hooks</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage hooks for CLI providers. Scan filesystem to import existing hooks or create new ones.
        </p>
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setActiveProvider(provider.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeProvider === provider.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {provider.label}
          </button>
        ))}
      </div>

      {/* Scope Toggle & Project Selector */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        {/* Scope Radio */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={scope === 'project'}
              onChange={() => setScope('project')}
              className="w-4 h-4 text-primary"
            />
            <FolderCode className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Project</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={scope === 'global'}
              onChange={() => setScope('global')}
              className="w-4 h-4 text-primary"
            />
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Global</span>
          </label>
        </div>

        {/* Project Selector (only when scope = project) */}
        {scope === 'project' && (
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Scan/Import Panel */}
      <CliHooksScanImportPanel
        provider={activeProvider}
        scope={scope}
        projectId={selectedProjectId}
        projectPath={projectPath}
        onImportComplete={triggerRefresh}
      />

      {/* Hooks List */}
      <CliHooksList
        key={refreshKey}
        provider={activeProvider}
        scope={scope}
        projectId={selectedProjectId}
        onEditHook={handleEditHook}
        onNewHook={handleNewHook}
      />

      {/* Editor Dialog */}
      <CliHookEditorDialog
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
        provider={activeProvider}
        scope={scope}
        projectId={selectedProjectId}
        hook={editingHook}
      />
    </div>
  );
}
