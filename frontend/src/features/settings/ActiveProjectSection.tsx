/**
 * Active Project Section
 * Settings for default active project - synced with backend API
 */

import { useState, useEffect } from 'react';
import { Loader2, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { projectsApi } from '@/adapters/api/projects-api';

export function ActiveProjectSection() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });
  const updateSettings = useUpdateSettings();

  const [activeProjectId, setActiveProjectId] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with API data
  useEffect(() => {
    if (settings) {
      setActiveProjectId(settings.currentActiveProjectId || '');
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      // Send null to clear, or the project ID to set
      currentActiveProjectId: activeProjectId || null,
    } as Parameters<typeof updateSettings.mutate>[0]);
    setHasChanges(false);
  };

  const isLoading = settingsLoading || projectsLoading;
  const projects = projectsData?.projects || [];

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
          <FolderOpen className="w-5 h-5 inline mr-2" />
          Default Project
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select a default project for new tasks. When set, projectId becomes optional during task creation.
        </p>
      </div>

      <div>
        <label htmlFor="activeProject" className="block text-sm font-medium text-foreground mb-1">
          Active Project
        </label>
        <select
          id="activeProject"
          value={activeProjectId}
          onChange={(e) => {
            setActiveProjectId(e.target.value);
            setHasChanges(true);
          }}
          className="w-full max-w-md px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">None (require projectId)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.path})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Tasks created without projectId will use this project.
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
