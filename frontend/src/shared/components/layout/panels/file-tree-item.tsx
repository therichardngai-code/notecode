import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, ExternalLink, MoreHorizontal, Loader2, FilePlus, FolderPlus, Trash2 } from 'lucide-react';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  hasChildren?: boolean; // true = folder has unloaded children (lazy loading)
}

interface FileTreeItemProps {
  node: FileNode;
  level?: number;
  path?: string;
  onFileClick?: (fileName: string, filePath: string) => void;
  onOpenInNewTab?: (fileName: string, filePath: string) => void;
  onFolderExpand?: (folderPath: string) => void;
  loadingPaths?: Set<string>;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDelete?: (path: string, isFolder: boolean) => void;
}

export function FileTreeItem({
  node,
  level = 0,
  path = '',
  onFileClick,
  onOpenInNewTab,
  onFolderExpand,
  loadingPaths,
  onCreateFile,
  onCreateFolder,
  onDelete,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isFolder = node.type === 'folder';
  const paddingLeft = level * 12 + 8;
  const currentPath = path ? `${path}/${node.name}` : node.name;
  const isLoading = loadingPaths?.has(currentPath) ?? false;
  const needsLoad = node.hasChildren && node.children === undefined;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    if (showMenu || contextMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleFolderClick = () => {
    if (needsLoad && onFolderExpand) {
      // Load children first, then expand
      onFolderExpand(currentPath);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={() => (isFolder ? handleFolderClick() : onFileClick?.(node.name, currentPath))}
        onContextMenu={handleContextMenu}
        className="w-full flex items-center gap-1 py-1 px-2 text-sm hover:bg-accent rounded-sm text-sidebar-foreground"
        style={{ paddingLeft }}
      >
        {isFolder ? (
          <>
            {isLoading ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            ) : isOpen ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
            {isOpen ? <FolderOpen className="w-4 h-4 shrink-0 text-yellow-500" /> : <Folder className="w-4 h-4 shrink-0 text-yellow-500" />}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className="w-4 h-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate flex-1 text-left">{node.name}</span>
      </button>

      {!isFolder && onOpenInNewTab && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {showMenu && (
        <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[140px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInNewTab?.(node.name, currentPath);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </button>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {isFolder && onCreateFile && (
            <button
              onClick={() => { onCreateFile(currentPath); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
            >
              <FilePlus className="w-3.5 h-3.5" /> New File
            </button>
          )}
          {isFolder && onCreateFolder && (
            <button
              onClick={() => { onCreateFolder(currentPath); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
            >
              <FolderPlus className="w-3.5 h-3.5" /> New Folder
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(currentPath, isFolder); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}

      {isFolder && isOpen && node.children?.map((child, idx) => (
        <FileTreeItem
          key={idx}
          node={child}
          level={level + 1}
          path={currentPath}
          onFileClick={onFileClick}
          onOpenInNewTab={onOpenInNewTab}
          onFolderExpand={onFolderExpand}
          loadingPaths={loadingPaths}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
