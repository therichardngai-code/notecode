import { useState, useRef, useEffect } from 'react';
import { Search, FileText, X, Loader2 } from 'lucide-react';
import { filesApi } from '@/adapters/api';

interface ContextFilePickerProps {
  projectId: string | null;
  value: string[];
  onChange: (files: string[]) => void;
}

export function ContextFilePicker({ projectId, value, onChange }: ContextFilePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ path: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSearchQuery('');
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      searchInputRef.current?.focus();
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Debounced file search API call
  useEffect(() => {
    if (!showDropdown || !projectId || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      filesApi.search(projectId, searchQuery.trim())
        .then((res: { results: Array<{ path: string; name: string }> }) => {
          // Filter out already selected files
          const filtered = res.results.filter((f: { path: string }) => !value.includes(f.path));
          setSearchResults(filtered.slice(0, 8));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, showDropdown, projectId, value]);

  const addFile = (filePath: string) => {
    if (!value.includes(filePath)) {
      onChange([...value, filePath]);
    }
    setSearchQuery('');
  };

  const removeFile = (filePath: string) => {
    onChange(value.filter((p) => p !== filePath));
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="relative">
        <div className="flex items-center gap-2 px-2 py-1 border border-input rounded bg-muted">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search files..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {showDropdown && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((file) => (
                <button
                  key={file.path}
                  onClick={() => addFile(file.path)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              ))
            ) : (
              <div className="py-2 px-3">
                <span className="text-sm text-muted-foreground">No files found</span>
              </div>
            )}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((filePath) => (
            <div
              key={filePath}
              className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs"
            >
              <span className="truncate max-w-[150px]">{filePath}</span>
              <button onClick={() => removeFile(filePath)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
