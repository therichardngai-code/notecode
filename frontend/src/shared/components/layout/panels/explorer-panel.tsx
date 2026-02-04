import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, RefreshCw, PanelLeftClose, Eye, EyeOff } from 'lucide-react';
import { FileTreeItem, type FileNode } from './file-tree-item';
import { filesApi } from '@/adapters/api/files-api';

// Mock file tree (fallback when no project)
const mockFileTree: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'components', type: 'folder', children: [{ name: 'Button.tsx', type: 'file' }] },
      { name: 'App.tsx', type: 'file' },
      { name: 'main.tsx', type: 'file' },
    ],
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];

// Convert API FileNode to UI FileNode format
function convertFileTree(nodes: any[]): FileNode[] {
  return nodes.map(node => ({
    name: node.name,
    type: node.type === 'directory' ? 'folder' as const : 'file' as const,
    children: node.children ? convertFileTree(node.children) : undefined,
    hasChildren: node.hasChildren, // Preserve lazy loading flag
  }));
}

// Merge loaded children into tree at target path
function mergeChildren(nodes: FileNode[], targetPath: string, newChildren: FileNode[]): FileNode[] {
  return nodes.map(node => {
    const nodePath = node.name; // At root level, path is just the name
    if (nodePath === targetPath.split('/')[0]) {
      // This is the target or an ancestor
      const remainingPath = targetPath.includes('/') ? targetPath.split('/').slice(1).join('/') : '';
      if (remainingPath === '') {
        // This is the target folder
        return { ...node, children: newChildren, hasChildren: undefined };
      }
      // Recurse into children
      if (node.children) {
        return {
          ...node,
          children: mergeChildrenRecursive(node.children, remainingPath, newChildren),
        };
      }
    }
    return node;
  });
}

function mergeChildrenRecursive(nodes: FileNode[], targetPath: string, newChildren: FileNode[]): FileNode[] {
  const [first, ...rest] = targetPath.split('/');
  return nodes.map(node => {
    if (node.name === first) {
      if (rest.length === 0) {
        return { ...node, children: newChildren, hasChildren: undefined };
      }
      if (node.children) {
        return { ...node, children: mergeChildrenRecursive(node.children, rest.join('/'), newChildren) };
      }
    }
    return node;
  });
}

// Recursively filter file tree based on search term
function filterFileTree(nodes: FileNode[], search: string): FileNode[] {
  if (!search.trim()) return nodes;

  const lowerSearch = search.toLowerCase();

  return nodes
    .map(node => {
      // Check if current node matches
      const nameMatches = node.name.toLowerCase().includes(lowerSearch);

      // For folders, recursively filter children
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterFileTree(node.children, search);
        // Include folder if it matches OR has matching children
        if (nameMatches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }

      // For files, include if name matches
      return nameMatches ? node : null;
    })
    .filter((node): node is FileNode => node !== null);
}

interface ExplorerPanelProps {
  onClose?: () => void;
  onFileClick?: (fileName: string, filePath: string) => void;
  onOpenInNewTab?: (fileName: string, filePath: string) => void;
  projectId?: string;
}

export function ExplorerPanel({ onClose, onFileClick, onOpenInNewTab, projectId }: ExplorerPanelProps) {
  const [search, setSearch] = useState('');
  const [fileTree, setFileTree] = useState<FileNode[]>(mockFileTree);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllFiles, setShowAllFiles] = useState(true);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  // Load real file tree from API with depth=1 for lazy loading
  useEffect(() => {
    if (!projectId) {
      // No project ID - use mock data
      setFileTree(mockFileTree);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    filesApi.getTree(projectId, '/', { depth: 1, showAll: showAllFiles })
      .then(res => {
        const children = res.tree.children || [];
        setFileTree(convertFileTree(children));
      })
      .catch(() => {
        setError('Failed to load file tree');
        setFileTree(mockFileTree); // Fallback to mock data
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, refreshKey, showAllFiles]);

  // Handle folder expand with lazy loading
  const handleFolderExpand = useCallback(async (folderPath: string) => {
    if (!projectId) return;

    setLoadingPaths(prev => new Set([...prev, folderPath]));
    try {
      const res = await filesApi.getTree(projectId, `/${folderPath}`, { depth: 1, showAll: showAllFiles });
      const children = res.tree.children || [];
      setFileTree(prev => mergeChildren(prev, folderPath, convertFileTree(children)));
    } catch (err) {
      console.error('Failed to load folder:', err);
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    }
  }, [projectId, showAllFiles]);

  // Memoized filtered file tree based on search
  const filteredFileTree = useMemo(
    () => filterFileTree(fileTree, search),
    [fileTree, search]
  );

  const handleRefresh = useCallback(() => {
    if (projectId) {
      setRefreshKey(prev => prev + 1);
    }
  }, [projectId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Explorer</span>
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
        {loading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading file tree...
          </div>
        )}
        {error && (
          <div className="text-center py-4 text-red-500 text-sm">
            {error}
          </div>
        )}
        {!loading && filteredFileTree.length === 0 && search && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No files match "{search}"
          </div>
        )}
        {!loading && filteredFileTree.map((node, idx) => (
          <FileTreeItem
            key={idx}
            node={node}
            onFileClick={onFileClick}
            onOpenInNewTab={onOpenInNewTab}
            onFolderExpand={handleFolderExpand}
            loadingPaths={loadingPaths}
          />
        ))}
      </div>
    </div>
  );
}
