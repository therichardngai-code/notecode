import { useEffect, useState } from 'react';
import { FileTreeNode } from './FileTreeNode';
import { fileSystemAdapter, type FileTreeNode as FileTreeNodeType } from './file-system-adapter';

interface FileTreeProps {
  onFileSelect: (filePath: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect }) => {
  const [tree, setTree] = useState<FileTreeNodeType | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const loadTree = async () => {
      const rootTree = await fileSystemAdapter.buildFileTree('/');
      setTree(rootTree);
    };
    loadTree();
  }, []);

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

  if (!tree) {
    return <div style={{ padding: '16px' }}>Loading...</div>;
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
