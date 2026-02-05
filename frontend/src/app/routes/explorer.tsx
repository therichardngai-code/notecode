import { createFileRoute } from '@tanstack/react-router';
import { FileEditor } from '@/features/explorer';
import { useState, useCallback, useEffect } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/adapters/api/projects-api';
import { filesApi } from '@/adapters/api/files-api';
import { Search, Plus, RefreshCw, Eye, EyeOff, FilePlus, FolderPlus, File } from 'lucide-react';
import { FileTreeItem, type FileNode } from '@/shared/components/layout/panels/file-tree-item';
import { useUIStore } from '@/shared/stores';
import { API_BASE_URL } from '@/shared/lib/api-config';
import { CreateFileDialog, DeleteConfirmationDialog } from '@/shared/components/dialogs';

export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
});

// Convert API FileNode to UI FileNode format
function convertFileTree(nodes: any[]): FileNode[] {
  return nodes.map(node => ({
    name: node.name,
    type: node.type === 'directory' ? 'folder' as const : 'file' as const,
    children: node.children ? convertFileTree(node.children) : undefined,
    hasChildren: node.hasChildren,
  }));
}

// Merge loaded children into tree at target path
function mergeChildrenRecursive(nodes: FileNode[], pathParts: string[], newChildren: FileNode[]): FileNode[] {
  if (pathParts.length === 0) return nodes;
  const [first, ...rest] = pathParts;
  return nodes.map(node => {
    if (node.name === first) {
      if (rest.length === 0) {
        return { ...node, children: newChildren, hasChildren: undefined };
      }
      if (node.children) {
        return { ...node, children: mergeChildrenRecursive(node.children, rest, newChildren) };
      }
    }
    return node;
  });
}

// Dialog state types
interface CreateDialogState {
  isOpen: boolean;
  type: 'file' | 'folder';
  parentPath: string;
}

interface DeleteDialogState {
  isOpen: boolean;
  path: string;
  isFolder: boolean;
}

function ExplorerPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAllFiles, setShowAllFiles] = useState(true);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [fileTree, setFileTree] = useState<FileNode[]>([]);

  // Dialog states
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ isOpen: false, type: 'file', parentPath: '' });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ isOpen: false, path: '', isFolder: false });
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  // Add menu and search states
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ path: string; name: string; type: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Load file tree with React Query (with caching) - depth=1 for lazy loading
  const { data: queryFileTree, isLoading, refetch } = useQuery({
    queryKey: ['fileTree', activeProjectId, showAllFiles],
    queryFn: async () => {
      const res = await filesApi.getTree(activeProjectId!, '/', { depth: 1, showAll: showAllFiles });
      return convertFileTree(res.tree.children || []);
    },
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Sync query data to local state (for lazy loading modifications)
  useEffect(() => {
    if (queryFileTree) {
      setFileTree(queryFileTree);
    }
  }, [queryFileTree]);

  // Close add menu when clicking outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handleClick = () => setShowAddMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showAddMenu]);

  // Local tree search - collect matching nodes from loaded tree
  const localSearchResults = useCallback(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    const results: Array<{ path: string; name: string; type: string }> = [];

    const searchNodes = (nodes: FileNode[], parentPath = '') => {
      for (const node of nodes) {
        const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.name.toLowerCase().includes(query)) {
          results.push({ path: nodePath, name: node.name, type: node.type });
        }
        if (node.children) {
          searchNodes(node.children, nodePath);
        }
      }
    };
    searchNodes(fileTree);
    return results.slice(0, 20); // Limit results
  }, [search, fileTree]);

  // Use local search results
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setSearchResults(localSearchResults());
      setIsSearching(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, localSearchResults]);

  // Handle folder expand with lazy loading
  const handleFolderExpand = useCallback(async (folderPath: string) => {
    if (!activeProjectId) return;

    setLoadingPaths(prev => new Set([...prev, folderPath]));
    try {
      const res = await filesApi.getTree(activeProjectId, `/${folderPath}`, { depth: 1, showAll: showAllFiles });
      const children = convertFileTree(res.tree.children || []);
      setFileTree(prev => mergeChildrenRecursive(prev, folderPath.split('/'), children));
    } catch (err) {
      console.error('Failed to load folder:', err);
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    }
  }, [activeProjectId, showAllFiles]);

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

  // Open create file dialog
  const handleCreateFile = useCallback((parentPath: string) => {
    setCreateDialog({ isOpen: true, type: 'file', parentPath });
  }, []);

  // Open create folder dialog
  const handleCreateFolder = useCallback((parentPath: string) => {
    setCreateDialog({ isOpen: true, type: 'folder', parentPath });
  }, []);

  // Confirm create file/folder
  const handleCreateConfirm = useCallback(async (name: string) => {
    if (!activeProjectId) return;
    const { type, parentPath } = createDialog;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    setIsDialogLoading(true);
    try {
      if (type === 'file') {
        await filesApi.createFile(activeProjectId, fullPath);
      } else {
        await filesApi.createFolder(activeProjectId, fullPath);
      }
      refetch();
      setCreateDialog({ isOpen: false, type: 'file', parentPath: '' });
    } catch (err) {
      console.error(`Failed to create ${type}:`, err);
    } finally {
      setIsDialogLoading(false);
    }
  }, [activeProjectId, createDialog, refetch]);

  // Open delete dialog
  const handleDelete = useCallback((path: string, isFolder: boolean) => {
    setDeleteDialog({ isOpen: true, path, isFolder });
  }, []);

  // Confirm delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!activeProjectId) return;
    const { path } = deleteDialog;

    setIsDialogLoading(true);
    try {
      await filesApi.deleteFile(activeProjectId, path);
      refetch();
      if (selectedFile === path) setSelectedFile(null);
      setDeleteDialog({ isOpen: false, path: '', isFolder: false });
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDialogLoading(false);
    }
  }, [activeProjectId, deleteDialog, refetch, selectedFile]);

  // Handle opening file in external editor (VS Code/Cursor)
  const handleOpenInExternalEditor = async (filePath: string) => {
    if (!activeProjectId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${activeProjectId}/files/open-external`, {
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
            <button
              onClick={() => setShowAllFiles(!showAllFiles)}
              className="p-1.5 rounded-lg hover:bg-muted"
              title={showAllFiles ? 'Showing all files (click to hide ignored)' : 'Hiding ignored files (click to show all)'}
            >
              {showAllFiles ? (
                <Eye className="w-4 h-4 text-muted-foreground" />
              ) : (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                className="p-1.5 rounded-lg hover:bg-muted"
                title="New file or folder"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[140px]">
                  <button
                    onClick={() => { setCreateDialog({ isOpen: true, type: 'file', parentPath: '' }); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <FilePlus className="w-3.5 h-3.5" /> New File
                  </button>
                  <button
                    onClick={() => { setCreateDialog({ isOpen: true, type: 'folder', parentPath: '' }); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> New Folder
                  </button>
                </div>
              )}
            </div>
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
          {/* Search Results */}
          {search.trim() ? (
            isSearching ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-0.5">
                {searchResults.map((result) => (
                  <button
                    key={result.path}
                    onClick={() => { setSelectedFile(result.path); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent rounded-sm text-left"
                  >
                    <File className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{result.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{result.path}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No files found
              </div>
            )
          ) : isLoading ? (
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
                onFolderExpand={handleFolderExpand}
                loadingPaths={loadingPaths}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedFile && activeProjectId ? (
          <FileEditor
            filePath={selectedFile}
            projectId={activeProjectId}
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

      {/* Create File/Folder Dialog */}
      <CreateFileDialog
        isOpen={createDialog.isOpen}
        type={createDialog.type}
        parentPath={createDialog.parentPath}
        onConfirm={handleCreateConfirm}
        onCancel={() => setCreateDialog({ isOpen: false, type: 'file', parentPath: '' })}
        isLoading={isDialogLoading}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        title={deleteDialog.isFolder ? 'Delete Folder' : 'Delete File'}
        itemName={deleteDialog.path.split('/').pop()}
        description="This action cannot be undone. The item will be permanently deleted."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, path: '', isFolder: false })}
        isLoading={isDialogLoading}
      />
    </div>
  );
}
