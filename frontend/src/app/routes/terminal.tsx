import { createFileRoute } from '@tanstack/react-router';
import { TerminalPanel } from '@/features/terminal';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/adapters/api/projects-api';
import { Terminal } from 'lucide-react';

export const Route = createFileRoute('/terminal')({
  component: TerminalPage,
});

function TerminalPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const activeProjectId = settings?.currentActiveProjectId;

  const { data: projectData } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      try {
        return await projectsApi.getById(activeProjectId!);
      } catch (err: unknown) {
        // Clear stale project ID on 404 (DB reset)
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
          updateSettings.mutate({ currentActiveProjectId: null });
          return null;
        }
        throw err;
      }
    },
    enabled: !!activeProjectId,
    retry: false,
  });

  const activeProject = projectData?.project ?? null;

  if (!activeProjectId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <p className="text-lg">No active project</p>
          <p className="text-sm mt-1">Select a project in Settings to use the terminal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-border bg-muted/30">
        <Terminal className="w-5 h-5 mr-2 text-muted-foreground" />
        <span className="text-sm font-medium">
          Terminal - {activeProject?.name || 'Project'}
        </span>
      </div>
      {/* Terminal Panel */}
      <div className="flex-1 min-h-0">
        <TerminalPanel projectId={activeProjectId} />
      </div>
    </div>
  );
}
