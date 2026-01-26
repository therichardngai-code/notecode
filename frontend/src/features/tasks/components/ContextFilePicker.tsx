import { useState, useRef, useEffect } from 'react';
import { Search, FileText, X } from 'lucide-react';

interface ContextFilePickerProps {
  value: string[];
  onChange: (files: string[]) => void;
}

const mockFileSystem = [
  { id: 'src-app', label: 'src/App.tsx', path: '/src/App.tsx' },
  { id: 'src-main', label: 'src/main.tsx', path: '/src/main.tsx' },
  { id: 'src-index-css', label: 'src/index.css', path: '/src/index.css' },
  { id: 'src-components-button', label: 'src/components/Button.tsx', path: '/src/components/Button.tsx' },
  { id: 'src-components-input', label: 'src/components/Input.tsx', path: '/src/components/Input.tsx' },
  { id: 'src-hooks-useAuth', label: 'src/hooks/useAuth.ts', path: '/src/hooks/useAuth.ts' },
  { id: 'src-utils-helpers', label: 'src/utils/helpers.ts', path: '/src/utils/helpers.ts' },
  { id: 'package-json', label: 'package.json', path: '/package.json' },
  { id: 'readme', label: 'README.md', path: '/README.md' },
  { id: 'tsconfig', label: 'tsconfig.json', path: '/tsconfig.json' },
];

export function ContextFilePicker({ value, onChange }: ContextFilePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return mockFileSystem
      .filter((f) => f.label.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
      .filter((f) => !value.includes(f.id))
      .slice(0, 8);
  };

  const addFile = (fileId: string) => {
    if (!value.includes(fileId)) {
      onChange([...value, fileId]);
    }
    setSearchQuery('');
  };

  const removeFile = (fileId: string) => {
    onChange(value.filter((id) => id !== fileId));
  };

  const searchResults = getSearchResults();

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="relative">
        <div className="flex items-center gap-2 px-2 py-1 border border-gray-300 rounded bg-gray-50">
          <Search className="w-3.5 h-3.5 text-gray-500" />
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
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>

        {showDropdown && searchQuery && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
            {searchResults.map((file) => (
              <button
                key={file.id}
                onClick={() => addFile(file.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{file.label}</span>
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchQuery && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 px-3 z-20">
            <span className="text-sm text-gray-500">No files found</span>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((fileId) => {
            const file = mockFileSystem.find((f) => f.id === fileId);
            return (
              <div
                key={fileId}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs"
              >
                <span className="truncate max-w-[150px]">{file?.label || fileId}</span>
                <button onClick={() => removeFile(fileId)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
