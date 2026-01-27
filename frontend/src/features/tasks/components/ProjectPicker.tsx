import { useState, useRef, useEffect } from 'react';
import { Folder, Search, Star, Loader2 } from 'lucide-react';
import { useProjects, useFavoriteProjects, useRecentProjects } from '@/shared/hooks/use-projects-query';

interface ProjectPickerProps {
  value?: string;
  onChange: (projectId: string) => void;
}

export function ProjectPicker({ value, onChange }: ProjectPickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects from API
  const { data: allProjects = [], isLoading: loadingAll } = useProjects(
    searchQuery ? { search: searchQuery } : undefined
  );
  const { data: favoriteProjects = [], isLoading: loadingFavorites } = useFavoriteProjects();
  const { data: recentProjects = [], isLoading: loadingRecent } = useRecentProjects(6);

  const isLoading = loadingAll || loadingFavorites || loadingRecent;

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

  // Find selected project from all projects
  const selectedProject = allProjects.find((p) => p.id === value);

  // Filter search results
  const searchResults = searchQuery.trim()
    ? allProjects.slice(0, 8)
    : [];

  const selectProject = (id: string) => {
    onChange(id);
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {selectedProject ? (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
        >
          <Folder className="w-3.5 h-3.5 text-gray-500" />
          <span>{selectedProject.name}</span>
        </button>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 px-2 py-1 border border-gray-300 rounded bg-gray-50">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 text-gray-500" />
            )}
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
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : searchQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No projects found</div>
            )
          ) : (
            <>
              {favoriteProjects.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Favorites
                  </div>
                  {favoriteProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                    >
                      <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </>
              )}

              {recentProjects.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mt-2">
                    Recent
                  </div>
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left"
                    >
                      <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </>
              )}

              {favoriteProjects.length === 0 && recentProjects.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No projects available</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
