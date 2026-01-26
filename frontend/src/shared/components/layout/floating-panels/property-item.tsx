import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Search, Folder, Star, FileText } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  propertyTypes,
  agentOptions,
  providerOptions,
  modelOptions,
  priorityOptions,
  skillsOptions,
  toolsOptions,
  mockProjects,
  mockFileSystem,
} from '@/shared/config/property-config';

export interface Property {
  id: string;
  type: 'project' | 'agent' | 'provider' | 'model' | 'priority' | 'skills' | 'tools' | 'context';
  value: string[];
}

interface PropertyItemProps {
  property: Property;
  onRemove: () => void;
  onUpdate: (values: string[]) => void;
}

export function PropertyItem({ property, onRemove, onUpdate }: PropertyItemProps) {
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
        return modelOptions;
      case 'priority':
        return priorityOptions;
      case 'skills':
        return skillsOptions;
      case 'tools':
        return toolsOptions.map((o) => ({ id: o.id, label: o.label }));
      case 'context':
        return [];
      default:
        return [];
    }
  };

  const isSingleSelect = ['project', 'agent', 'provider', 'model', 'priority'].includes(property.type);

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
    const query = searchQuery.toLowerCase();
    return mockProjects.all.filter((p) => p.label.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)).slice(0, 8);
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

    // Handle "All Tools" selection for tools
    if (property.type === 'tools') {
      const allToolIds = toolsOptions.filter((t) => t.id !== 'all').map((t) => t.id);
      if (id === 'all') {
        if (property.value.includes('all')) {
          onUpdate([]);
        } else {
          onUpdate(['all', ...allToolIds]);
        }
        return;
      } else {
        if (property.value.includes(id)) {
          onUpdate(property.value.filter((v) => v !== id && v !== 'all'));
        } else {
          const newValues = [...property.value.filter((v) => v !== 'all'), id];
          const hasAllIndividual = allToolIds.every((t) => newValues.includes(t));
          onUpdate(hasAllIndividual ? ['all', ...allToolIds] : newValues);
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
      const project = mockProjects.all.find((p) => p.id === property.value[0]);
      return project?.label || 'Select...';
    }
    if (property.type === 'tools' && property.value.includes('all')) {
      return 'All Tools';
    }
    if (property.type === 'context') {
      return `${property.value.length} file${property.value.length > 1 ? 's' : ''} selected`;
    }
    const options = getOptions();
    return property.value.map((v) => options.find((o) => o.id === v)?.label || v).join(', ');
  };

  // Project property with search
  if (property.type === 'project') {
    const selectedProject = mockProjects.all.find((p) => p.id === property.value[0]);

    return (
      <div className="flex items-start gap-3 group">
        <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground pt-1">
          <Icon className="w-4 h-4" />
          <span>{typeConfig?.label}</span>
        </div>
        <div className="flex-1" ref={dropdownRef}>
          {selectedProject ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-2 py-1 text-sm text-foreground hover:bg-muted rounded transition-colors">
                <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{selectedProject.label}</span>
              </button>
              <button onClick={() => onUpdate([])} className="p-0.5 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
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
                  placeholder="Search projects..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-64 overflow-y-auto">
                  {searchQuery ? (
                    getProjectSearchResults().length > 0 ? (
                      getProjectSearchResults().map((project) => (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left"
                        >
                          <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{project.label}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                    )
                  ) : (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Favorites
                      </div>
                      {mockProjects.favorites.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left"
                        >
                          <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{project.label}</span>
                        </button>
                      ))}
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Recent</div>
                      {mockProjects.recent.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left"
                        >
                          <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{project.label}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
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
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                {searchResults.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => addContextFile(file.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.label}</span>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-2 px-3 z-20">
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
            <div className="absolute top-full left-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleValue(opt.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors', property.value.includes(opt.id) && 'bg-accent')}
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
          <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
            {getOptions().map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggleValue(opt.id)}
                className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors', property.value.includes(opt.id) && 'bg-accent')}
              >
                {isSingleSelect ? (
                  <span className={cn('w-4 h-4 border rounded-full flex items-center justify-center', property.value.includes(opt.id) ? 'border-primary' : 'border-border')}>
                    {property.value.includes(opt.id) && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                ) : (
                  <span className={cn('w-4 h-4 border rounded flex items-center justify-center text-xs', property.value.includes(opt.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-border')}>
                    {property.value.includes(opt.id) && '✓'}
                  </span>
                )}
                {opt.label}
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
