import { useEffect, useState } from 'react';
import { FileTreeNode } from './FileTreeNode';
import { fileSystemAdapter, type FileTreeNode as FileTreeNodeType } from './file-system-adapter';
import { RealFileSystemAdapter } from './real-file-system-adapter';
import { LoadingSpinner } from '@/shared/components/common';

interface FileTreeProps {
  onFileSelect: (filePath: string) => void;
  projectId?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, projectId }) => {
  const [tree, setTree] = useState<FileTreeNodeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const loadTree = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use real adapter if projectId provided, otherwise mock
        const adapter = projectId
          ? new RealFileSystemAdapter(projectId)
          : fileSystemAdapter;

        const rootTree = await adapter.buildFileTree('/');
        setTree(rootTree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
      } finally {
        setLoading(false);
      }
    };
    loadTree();
  }, [projectId]);

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
      <FileTreeNode
        node={tree}
        onFileClick={onFileSelect}
        onContextMenu={handleContextMenu}
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
