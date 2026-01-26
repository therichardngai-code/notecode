import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Search, File, FileText, Code } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

export const Route = createFileRoute('/search')({
  component: SearchPage,
});

interface SearchResult {
  id: string;
  type: 'file' | 'code' | 'task' | 'session';
  title: string;
  path?: string;
  preview: string;
  line?: number;
}

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'files' | 'code' | 'tasks'>('all');

  const handleSearch = () => {
    if (!query.trim()) return;

    setIsSearching(true);
    // Mock search results - replace with actual search
    setTimeout(() => {
      setResults([
        { id: '1', type: 'file', title: 'ChatContainer.tsx', path: 'src/features/chat', preview: 'Main chat container component' },
        { id: '2', type: 'code', title: 'useMessages hook', path: 'src/features/chat/hooks', preview: 'const { messages, sendMessage } = useMessages()', line: 15 },
        { id: '3', type: 'task', title: 'Implement search feature', preview: 'Add global workspace search functionality' },
      ]);
      setIsSearching(false);
    }, 500);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'file': return <File className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold mb-4">Search</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files, code, tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          {(['all', 'files', 'code', 'tasks'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {results.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search query to find files, code, and tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getIcon(result.type)}
                  <span className="font-medium">{result.title}</span>
                  {result.line && (
                    <span className="text-xs text-muted-foreground">Line {result.line}</span>
                  )}
                </div>
                {result.path && (
                  <p className="text-xs text-muted-foreground mt-1">{result.path}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{result.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
