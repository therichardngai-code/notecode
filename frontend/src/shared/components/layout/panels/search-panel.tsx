import { useState } from 'react';
import { Search, PanelLeftClose } from 'lucide-react';

interface SearchPanelProps {
  onClose?: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Search</span>
        <div className="w-7" />
      </div>
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-sidebar-border bg-sidebar text-sm focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 px-3 py-2 text-sm text-muted-foreground">Type to search across files</div>
    </div>
  );
}
