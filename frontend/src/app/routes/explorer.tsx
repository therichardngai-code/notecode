import { createFileRoute } from '@tanstack/react-router';
import { FileViewer } from '@/features/explorer';
import { useState } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/adapters/api/projects-api';
import { filesApi } from '@/adapters/api/files-api';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { FileTreeItem, type FileNode } from '@/shared/components/layout/panels/file-tree-item';
import { useUIStore } from '@/shared/stores';

export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
});

// Convert API FileNode to UI FileNode format
function convertFileTree(nodes: any[]): FileNode[] {
  return nodes.map(node => ({
    name: node.name,
    type: node.type === 'directory' ? 'folder' as const : 'file' as const,
    children: node.children ? convertFileTree(node.children) : undefined,
  }));
}

function ExplorerPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: settings } = useSettings();
  const activeProjectId = settings?.currentActiveProjectId;

  const { data: projectData } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsApi.getById(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const activeProject = projectData?.project;

  // Get function to open file in new tab
  const openFileAsTab = useUIStore((state) => state.openFileAsTab);

  // Load file tree with React Query (with caching)
  const { data: fileTree = [], isLoading, refetch } = useQuery({
    queryKey: ['fileTree', activeProjectId],
    queryFn: async () => {
      const res = await filesApi.getTree(activeProjectId!);
      return convertFileTree(res.tree.children || []);
    },
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    refetch();
  };

  // Handle opening file in new tab
  const handleOpenInNewTab = async (_fileName: string, filePath: string) => {
    if (!activeProjectId) return;

    try {
      // Load file content from API
      const response = await filesApi.readFile(activeProjectId, filePath);

      // Open file in application tab
      openFileAsTab(filePath, response.content);
    } catch (error) {
      console.error('Failed to open file in new tab:', error);
    }
  };

  // Handle opening file in external editor (VS Code/Cursor)
  const handleOpenInExternalEditor = async (filePath: string) => {
    if (!activeProjectId) return;

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/projects/${activeProjectId}/files/open-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to open file:', error.error);
      }
    } catch (error) {
      console.error('Failed to open file in editor:', error);
    }
  };

  return (
    <div className="h-full flex">
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">
            {activeProject?.name || 'Explorer'}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-muted">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-muted">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg glass text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading file tree...
            </div>
          ) : (
            fileTree.map((node, idx) => (
              <FileTreeItem
                key={idx}
                node={node}
                onFileClick={(_, path) => setSelectedFile(path)}
                onOpenInNewTab={handleOpenInNewTab}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <FileViewer
            filePath={selectedFile}
            projectId={activeProjectId ?? undefined}
            onOpenInEditor={handleOpenInExternalEditor}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">No file selected</p>
              <p className="text-sm mt-1">
                {activeProject
                  ? 'Select a file from the explorer'
                  : 'No active project set. Go to Settings.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
