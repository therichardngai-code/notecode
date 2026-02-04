import { useEffect, useState, useCallback, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FileTreeNode } from './FileTreeNode';
import { fileSystemAdapter, type FileTreeNode as FileTreeNodeType } from './file-system-adapter';
import { RealFileSystemAdapter } from './real-file-system-adapter';
import { LoadingSpinner } from '@/shared/components/common';
import { Button } from '@/shared/components/ui/button';
import { mergeTreeChildren } from './utils/tree-utils';

interface FileTreeProps {
  onFileSelect: (filePath: string) => void;
  projectId?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, projectId }) => {
  const [tree, setTree] = useState<FileTreeNodeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [showAllFiles, setShowAllFiles] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  // Store adapter ref to avoid recreating on each render
  const adapterRef = useRef<RealFileSystemAdapter | typeof fileSystemAdapter | null>(null);

  // Initial load with depth=1 (top level only), reload when showAllFiles changes
  useEffect(() => {
    const loadTree = async () => {
      setLoading(true);
      setError(null);
      setExpandedPaths(new Set());
      setLoadingPaths(new Set());
      try {
        // Use real adapter if projectId provided, otherwise mock
        const adapter = projectId
          ? new RealFileSystemAdapter(projectId)
          : fileSystemAdapter;

        adapterRef.current = adapter;

        // Load with depth=1 for lazy loading (only immediate children)
        const rootTree = await adapter.buildFileTree('/', { depth: 1, showAll: showAllFiles });
        setTree(rootTree);
        // Auto-expand root
        setExpandedPaths(new Set([rootTree.path]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
      } finally {
        setLoading(false);
      }
    };
    loadTree();
  }, [projectId, showAllFiles]);

  // Handle folder expand/collapse with lazy loading
  const handleFolderExpand = useCallback(
    async (folderPath: string) => {
      // Check if this folder needs to load children
      const findNode = (node: FileTreeNodeType, path: string): FileTreeNodeType | null => {
        if (node.path === path) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, path);
            if (found) return found;
          }
        }
        return null;
      };

      const targetNode = tree ? findNode(tree, folderPath) : null;
      const needsLoad = targetNode?.hasChildren && targetNode?.children === undefined;

      if (needsLoad && adapterRef.current) {
        // Load children first
        setLoadingPaths((prev) => new Set([...prev, folderPath]));
        try {
          const folderTree = await adapterRef.current.buildFileTree(folderPath, {
            depth: 1,
            showAll: showAllFiles,
          });
          // Merge children into tree
          setTree((prev) =>
            prev ? mergeTreeChildren(prev, folderPath, folderTree.children || []) : prev
          );
          // Add to expanded
          setExpandedPaths((prev) => new Set([...prev, folderPath]));
        } catch (err) {
          console.error('Failed to load folder:', err);
        } finally {
          setLoadingPaths((prev) => {
            const next = new Set(prev);
            next.delete(folderPath);
            return next;
          });
        }
      } else {
        // Toggle expand/collapse
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          if (next.has(folderPath)) {
            next.delete(folderPath);
          } else {
            next.add(folderPath);
          }
          return next;
        });
      }
    },
    [tree, showAllFiles]
  );

  const handleContextMenu = (path: string, event: React.MouseEvent) => {
    setContextMenu({ path, x: event.clientX, y: event.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleCloseContextMenu);
      return () => document.removeEventListener('click', handleCloseContextMenu);
    }
  }, [contextMenu]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        <p className="text-sm font-medium">Error loading file tree</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!tree) {
    return <div className="p-4 text-muted-foreground text-sm">No files found</div>;
  }

  return (
    <div style={{ padding: '8px', height: '100%', overflow: 'auto' }}>
      {/* Show All Files Toggle */}
      <div className="flex items-center justify-end mb-2 pr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllFiles(!showAllFiles)}
          title={showAllFiles ? 'Showing all files (click to hide ignored)' : 'Hiding ignored files (click to show all)'}
          className="h-6 w-6 p-0"
        >
          {showAllFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>

      <FileTreeNode
        node={tree}
        onFileClick={onFileSelect}
        onContextMenu={handleContextMenu}
        onFolderExpand={handleFolderExpand}
        expandedPaths={expandedPaths}
        loadingPaths={loadingPaths}
      />
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => {
              onFileSelect(contextMenu.path);
              handleCloseContextMenu();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Open
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.path);
              handleCloseContextMenu();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Copy Path
          </button>
        </div>
      )}
    </div>
  );
};
