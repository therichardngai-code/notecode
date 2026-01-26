import { useState, useRef, useEffect } from 'react';
import { Folder, Search, Star } from 'lucide-react';

interface ProjectPickerProps {
  value?: string;
  onChange: (projectId: string) => void;
}

const mockProjects = {
  favorites: [
    { id: 'notecode', label: 'notecode', path: '/projects/notecode' },
    { id: 'gemkit-cli', label: 'gemkit-cli', path: '/projects/gemkit-cli' },
    { id: 'ai-dashboard', label: 'ai-dashboard', path: '/projects/ai-dashboard' },
  ],
  recent: [
    { id: 'testing-0.4', label: 'testing-0.4', path: '/projects/testing-0.4' },
    { id: 'gemkit-ecosystem', label: 'gemkit-ecosystem', path: '/projects/gemkit-ecosystem' },
    { id: 'docs-portal', label: 'docs-portal', path: '/projects/docs-portal' },
  ],
  all: [
    { id: 'notecode', label: 'notecode', path: '/projects/notecode' },
    { id: 'gemkit-cli', label: 'gemkit-cli', path: '/projects/gemkit-cli' },
    { id: 'ai-dashboard', label: 'ai-dashboard', path: '/projects/ai-dashboard' },
    { id: 'testing-0.4', label: 'testing-0.4', path: '/projects/testing-0.4' },
    { id: 'gemkit-ecosystem', label: 'gemkit-ecosystem', path: '/projects/gemkit-ecosystem' },
    { id: 'docs-portal', label: 'docs-portal', path: '/projects/docs-portal' },
    { id: 'backend-api', label: 'backend-api', path: '/projects/backend-api' },
    { id: 'mobile-app', label: 'mobile-app', path: '/projects/mobile-app' },
  ],
};

export function ProjectPicker({ value, onChange }: ProjectPickerProps) {
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

  const selectedProject = mockProjects.all.find((p) => p.id === value);

  const getProjectSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return mockProjects.all
      .filter((p) => p.label.toLowerCase().includes(query) || p.path.toLowerCase().includes(query))
      .slice(0, 8);
  };

  const selectProject = (id: string) => {
    onChange(id);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const searchResults = getProjectSearchResults();

  return (
    <div className="relative" ref={dropdownRef}>
      {selectedProject ? (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
        >
          <Folder className="w-3.5 h-3.5 text-gray-500" />
          <span>{selectedProject.label}</span>
        </button>
      ) : (
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
              placeholder="Search projects..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 max-h-64 overflow-y-auto">
          {searchQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{project.label}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No projects found</div>
            )
          ) : (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3" />
                Favorites
              </div>
              {mockProjects.favorites.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{project.label}</span>
                </button>
              ))}

              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mt-2">
                Recent
              </div>
              {mockProjects.recent.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{project.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
