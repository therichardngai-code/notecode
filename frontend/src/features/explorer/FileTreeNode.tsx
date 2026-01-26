import { useState } from 'react';
import type { FileTreeNode as FileTreeNodeType } from './file-system-adapter';

interface FileTreeNodeProps {
  node: FileTreeNodeType;
  onFileClick: (filePath: string) => void;
  onContextMenu: (filePath: string, event: React.MouseEvent) => void;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  onFileClick,
  onContextMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (node.isDirectory) {
      handleToggle();
    } else {
      onFileClick(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(node.path, e);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {node.isDirectory && (
          <span style={{ fontSize: '12px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          {node.isDirectory ? '📁' : '📄'} {node.name}
        </span>
      </div>
      {node.isDirectory && isExpanded && node.children && (
        <div style={{ marginLeft: '16px' }}>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};
