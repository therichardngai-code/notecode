import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Search, Folder, Star, FileText, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  propertyTypes,
  agentOptions,
  providerOptions,
  getModelsForProvider,
  priorityOptions,
  skillsOptions,
  toolsOptions,
  permissionModeOptions,
  mockFileSystem,
} from '@/shared/config/property-config';
import { useProjects, useFavoriteProjects, useRecentProjects, useCreateProject } from '@/shared/hooks/use-projects-query';
import { useFolderPicker } from '@/shared/hooks/use-folder-picker';

export interface Property {
  id: string;
  type: 'project' | 'agent' | 'provider' | 'model' | 'priority' | 'skills' | 'tools' | 'context' | 'subagentDelegates' | 'autoBranch' | 'autoCommit' | 'permissionMode';
  value: string[]; // For toggles: ['true'] or []
}

interface PropertyItemProps {
  property: Property;
  onRemove: () => void;
  onUpdate: (values: string[]) => void;
  selectedProvider?: string; // For filtering models by provider
}

export function PropertyItem({ property, onRemove, onUpdate, selectedProvider }: PropertyItemProps) {
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
  const isLoadingProjects = loadingAll || loadingFavorites || loadingRecent;

  // Create project via folder picker
  const createProject = useCreateProject();
  const { selectFolder, isSelecting: isSelectingFolder } = useFolderPicker({
    onSelect: async (path, name) => {
      const result = await createProject.mutateAsync({ name, path });
      if (result?.id) {
        onUpdate([result.id]);
        setShowDropdown(false);
      }
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSearchQuery('');
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      if ((property.type === 'context' || property.type === 'project') && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, property.type]);

  const typeConfig = propertyTypes.find((t) => t.id === property.type);
  const Icon = typeConfig?.icon || FileText;

  const getOptions = () => {
    switch (property.type) {
      case 'project':
        return [];
      case 'agent':
        return agentOptions.map((o) => ({ id: o.id, label: o.label }));
      case 'provider':
        return providerOptions;
      case 'model':
        return getModelsForProvider(selectedProvider);
      case 'priority':
        return priorityOptions;
      case 'skills':
        return skillsOptions;
      case 'tools':
        return toolsOptions.map((o) => ({ id: o.id, label: o.label }));
      case 'permissionMode':
        return permissionModeOptions.map((o) => ({ id: o.id, label: o.label }));
      case 'context':
        return [];
      default:
        return [];
    }
  };

  const isSingleSelect = ['project', 'agent', 'provider', 'model', 'priority', 'permissionMode'].includes(property.type);

  const getContextSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return mockFileSystem
      .filter((f) => f.label.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
      .filter((f) => !property.value.includes(f.id))
      .slice(0, 8);
  };

  const getProjectSearchResults = () => {
    if (!searchQuery.trim()) return [];
    return allProjects.slice(0, 8);
  };

  const selectProject = (id: string) => {
    onUpdate([id]);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const toggleValue = (id: string) => {
    if (isSingleSelect) {
      onUpdate(property.value.includes(id) ? [] : [id]);
      setShowDropdown(false);
      return;
    }

    // Handle "All Tools" selection for tools (allowlist mode - selected = allowed)
    if (property.type === 'tools') {
      const allToolIds = toolsOptions.filter((t) => t.id !== 'All').map((t) => t.id);

      if (id === 'All') {
        if (property.value.length === allToolIds.length) {
          // Deselect all
          onUpdate([]);
        } else {
          // Select all individual tools
          onUpdate(allToolIds);
        }
        return;
      } else {
        if (property.value.includes(id)) {
          onUpdate(property.value.filter((v) => v !== id));
        } else {
          onUpdate([...property.value, id]);
        }
        return;
      }
    }

    // Default multi-select
    if (property.value.includes(id)) {
      onUpdate(property.value.filter((v) => v !== id));
    } else {
      onUpdate([...property.value, id]);
    }
  };

  const addContextFile = (id: string) => {
    if (!property.value.includes(id)) {
      onUpdate([...property.value, id]);
    }
    setSearchQuery('');
  };

  const removeContextFile = (id: string) => {
    onUpdate(property.value.filter((v) => v !== id));
  };

  const getDisplayValue = () => {
    if (property.value.length === 0) return 'Select...';
    if (property.type === 'project') {
      const project = allProjects.find((p) => p.id === property.value[0]);
      return project?.name || 'Select...';
    }
    // Show "All Tools" when all individual tools are selected
    if (property.type === 'tools') {
      const allToolIds = toolsOptions.filter((t) => t.id !== 'All').map((t) => t.id);
      const hasAllTools = allToolIds.every((t) => property.value.includes(t));
      if (hasAllTools) return 'All Tools';
    }
    if (property.type === 'context') {
      return `${property.value.length} file${property.value.length > 1 ? 's' : ''} selected`;
    }
    const options = getOptions();
    return property.value.map((v) => options.find((o) => o.id === v)?.label || v).join(', ');
  };

  // Project property with search (API-connected) - MANDATORY, no remove button
  if (property.type === 'project') {
    const selectedProject = allProjects.find((p) => p.id === property.value[0]);
    const searchResults = getProjectSearchResults();

    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground pt-1">
          <Icon className="w-4 h-4" />
          <span>{typeConfig?.label}</span>
        </div>
        <div className="flex-1 relative" ref={dropdownRef}>
          {/* Clickable button to show selected project or open dropdown */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 py-1 text-sm text-foreground hover:bg-muted rounded transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{selectedProject?.name || 'Select project...'}</span>
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 max-h-64 overflow-y-auto">
              {/* Search input inside dropdown */}
              <div className="px-2 py-1.5 border-b border-white/10">
                <div className="flex items-center gap-2 px-2 py-1 border border-border rounded bg-muted/30">
                  {isLoadingProjects ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {isLoadingProjects ? (
                <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : searchQuery ? (
                searchResults.length > 0 ? (
                  searchResults.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left',
                        property.value[0] === project.id && 'bg-white/10'
                      )}
                    >
                      <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{project.name}</span>
                      {property.value[0] === project.id && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                )
              ) : (
                <>
                  {favoriteProjects.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Favorites
                      </div>
                      {favoriteProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left',
                            property.value[0] === project.id && 'bg-white/10'
                          )}
                        >
                          <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{project.name}</span>
                          {property.value[0] === project.id && <span className="ml-auto text-primary">✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                  {recentProjects.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Recent</div>
                      {recentProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left',
                            property.value[0] === project.id && 'bg-white/10'
                          )}
                        >
                          <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{project.name}</span>
                          {property.value[0] === project.id && <span className="ml-auto text-primary">✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                  {favoriteProjects.length === 0 && recentProjects.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No projects available</div>
                  )}
                </>
              )}
              {/* Open folder to create project */}
              <div className="border-t border-white/20 dark:border-white/10 mt-1 pt-1">
                <button
                  onClick={() => selectFolder('Select Project Folder')}
                  disabled={isSelectingFolder || createProject.isPending}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                >
                  {isSelectingFolder || createProject.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Open Folder</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* No remove button - project is mandatory */}
      </div>
    );
  }

  // Context property with file search
  if (property.type === 'context') {
    const searchResults = getContextSearchResults();

    return (
      <div className="flex items-start gap-3 group">
        <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground pt-1">
          <Icon className="w-4 h-4" />
          <span>{typeConfig?.label}</span>
        </div>
        <div className="flex-1" ref={dropdownRef}>
          <div className="relative">
            <div className="flex items-center gap-2 px-2 py-1 border border-border rounded bg-muted/30">
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

            {showDropdown && searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                {searchResults.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => addContextFile(file.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.label}</span>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-2 px-3 z-20">
                <span className="text-sm text-muted-foreground">No files found</span>
              </div>
            )}
          </div>

          {property.value.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {property.value.map((fileId) => {
                const file = mockFileSystem.find((f) => f.id === fileId);
                return (
                  <div key={fileId} className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-foreground">
                    <span className="truncate max-w-[120px]">{file?.label || fileId}</span>
                    <button onClick={() => removeContextFile(fileId)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Priority property with color indicators
  if (property.type === 'priority') {
    const selectedPriority = priorityOptions.find((p) => p.id === property.value[0]);

    return (
      <div className="flex items-center gap-3 group">
        <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span>{typeConfig?.label}</span>
        </div>
        <div className="relative flex-1" ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 text-sm text-foreground hover:bg-muted px-2 py-1 rounded transition-colors">
            {selectedPriority ? (
              <>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedPriority.color }} />
                <span>{selectedPriority.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select...</span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-44 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-20">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleValue(opt.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors', property.value.includes(opt.id) && 'bg-white/20 dark:bg-white/10')}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  <span>{opt.label}</span>
                  {property.value.includes(opt.id) && <span className="ml-auto text-primary">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Toggle property (subagentDelegates, autoBranch, autoCommit)
  // autoBranch is mandatory (no remove button)
  if (['subagentDelegates', 'autoBranch', 'autoCommit'].includes(property.type)) {
    const isEnabled = property.value.includes('true');
    const isMandatory = property.type === 'autoBranch';

    return (
      <div className={cn('flex items-center gap-3', !isMandatory && 'group')}>
        <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span>{typeConfig?.label}</span>
        </div>
        <button
          onClick={() => onUpdate(isEnabled ? [] : ['true'])}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
            isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        >
          <span
            className={cn(
              'pointer-events-none h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
              isEnabled ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
        {!isMandatory && (
          <button onClick={onRemove} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  // Default property rendering
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{typeConfig?.label}</span>
      </div>
      <div className="relative flex-1" ref={dropdownRef}>
        <button onClick={() => setShowDropdown(!showDropdown)} className="text-sm text-foreground hover:bg-muted px-2 py-1 rounded transition-colors truncate max-w-[200px]">
          {getDisplayValue()}
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
            {getOptions().map((opt) => {
              // For tools "All" option, check if all individual tools are selected
              const isAllToolsSelected = property.type === 'tools' && opt.id === 'All' &&
                toolsOptions.filter((t) => t.id !== 'All').every((t) => property.value.includes(t.id));
              const isSelected = isAllToolsSelected || property.value.includes(opt.id);

              return (
                <button
                  key={opt.id}
                  onClick={() => toggleValue(opt.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors', isSelected && 'bg-white/20 dark:bg-white/10')}
                >
                  {isSingleSelect ? (
                    <span className={cn('w-4 h-4 border rounded-full flex items-center justify-center', isSelected ? 'border-primary' : 'border-white/30')}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </span>
                  ) : (
                    <span className={cn('w-4 h-4 border rounded flex items-center justify-center text-xs', isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-white/30')}>
                      {isSelected && '✓'}
                    </span>
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={onRemove} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
