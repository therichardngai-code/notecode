import type { FileTreeNode as FileTreeNodeType } from './file-system-adapter';
import { LoadingSpinner } from '@/shared/components/common';

interface FileTreeNodeProps {
  node: FileTreeNodeType;
  onFileClick: (filePath: string) => void;
  onContextMenu: (filePath: string, event: React.MouseEvent) => void;
  onFolderExpand?: (folderPath: string) => void;
  expandedPaths?: Set<string>;
  loadingPaths?: Set<string>;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  onFileClick,
  onContextMenu,
  onFolderExpand,
  expandedPaths,
  loadingPaths,
}) => {
  // Use controlled expand state if provided, otherwise default to expanded
  const isExpanded = expandedPaths ? expandedPaths.has(node.path) : true;
  const isLoading = loadingPaths?.has(node.path) ?? false;
  const needsLoad = node.hasChildren && node.children === undefined;

  const handleClick = () => {
    if (!node.isDirectory) {
      onFileClick(node.path);
      return;
    }

    // Directory click - check if we need to load children first
    if (needsLoad && onFolderExpand) {
      onFolderExpand(node.path);
    } else if (onFolderExpand) {
      // Toggle expand/collapse (let parent manage state)
      onFolderExpand(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(node.path, e);
  };

  // Render chevron or loading spinner for directories
  const renderDirectoryIcon = () => {
    if (isLoading) {
      return <LoadingSpinner className="w-3 h-3" />;
    }
    return (
      <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
    );
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
        {node.isDirectory && renderDirectoryIcon()}
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
              onFolderExpand={onFolderExpand}
              expandedPaths={expandedPaths}
              loadingPaths={loadingPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
};
