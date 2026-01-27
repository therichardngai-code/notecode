import { useState } from 'react';
import { Search, Plus, RefreshCw, PanelLeftClose } from 'lucide-react';
import { FileTreeItem, type FileNode } from './file-tree-item';

// Mock file tree
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

interface ExplorerPanelProps {
  onClose?: () => void;
  onFileClick?: (fileName: string, filePath: string) => void;
  onOpenInNewTab?: (fileName: string, filePath: string) => void;
}

export function ExplorerPanel({ onClose, onFileClick, onOpenInNewTab }: ExplorerPanelProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Explorer</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted">
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
        {mockFileTree.map((node, idx) => (
          <FileTreeItem key={idx} node={node} onFileClick={onFileClick} onOpenInNewTab={onOpenInNewTab} />
        ))}
      </div>
    </div>
  );
}
