import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronsRight, Sparkles, Plus, Zap, Maximize2, GripVertical } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useUIStore } from '@/shared/stores';
import { useSettings } from '@/shared/hooks/use-settings';
import { propertyTypes } from '@/shared/config/property-config';
import { PropertyItem, type Property } from './property-item';

export interface TaskData {
  title: string;
  requirement: string;
  properties: Property[];
}

interface FloatingNewTaskPanelProps {
  onCreateTask?: (task: TaskData) => void;
  onAutoStart?: (task: TaskData) => void;
  onOpenFullTask?: () => void;
}

export function FloatingNewTaskPanel({ onCreateTask, onAutoStart, onOpenFullTask }: FloatingNewTaskPanelProps) {
  const { isNewTaskPanelOpen, closeNewTaskPanel } = useUIStore();
  const { data: settings } = useSettings();

  const [title, setTitle] = useState('New Task');
  const [requirement, setRequirement] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  // Calculate left position from width
  const panelLeft = typeof window !== 'undefined' ? window.innerWidth - panelWidth : 1440;

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Update on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      setPanelWidth((w) => w);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(480, Math.min(window.innerWidth - e.clientX, window.innerWidth - 560));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeNewTaskPanel();
      }
    };
    if (isNewTaskPanelOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isNewTaskPanelOpen, closeNewTaskPanel]);

  // Close add property dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addPropertyRef.current && !addPropertyRef.current.contains(e.target as Node)) {
        setShowAddProperty(false);
      }
    };
    if (showAddProperty) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddProperty]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNewTaskPanel();
      }
    };
    if (isNewTaskPanelOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isNewTaskPanelOpen, closeNewTaskPanel]);

  // Reset form when panel opens (project mandatory, autoBranch enabled by default)
  useEffect(() => {
    if (isNewTaskPanelOpen) {
      setTitle('New Task');
      setRequirement('');
      const defaultProjectId = settings?.currentActiveProjectId;
      setProperties([
        // Use currentActiveProjectId from settings if available, otherwise user must select
        { id: 'project-default', type: 'project', value: defaultProjectId ? [defaultProjectId] : [] },
        { id: 'autoBranch-default', type: 'autoBranch', value: ['true'] },
      ]);
    }
  }, [isNewTaskPanelOpen, settings?.currentActiveProjectId]);

  const addProperty = (type: Property['type']) => {
    if (properties.find((p) => p.type === type)) {
      setShowAddProperty(false);
      return;
    }
    setProperties([
      ...properties,
      {
        id: Date.now().toString(),
        type,
        value: [],
      },
    ]);
    setShowAddProperty(false);
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const updateProperty = (id: string, values: string[]) => {
    setProperties(properties.map((p) => (p.id === id ? { ...p, value: values } : p)));
  };

  const getTaskData = (): TaskData => ({
    title,
    requirement,
    properties,
  });

  const handleCreateTask = () => {
    onCreateTask?.(getTaskData());
    closeNewTaskPanel();
  };

  const handleAutoStart = () => {
    onAutoStart?.(getTaskData());
    closeNewTaskPanel();
  };

  return (
    <>
      {/* Backdrop */}
      {isNewTaskPanelOpen && <div className="fixed inset-0 z-40 bg-black/20" />}

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        style={{ left: `${panelLeft}px` }}
        className={cn(
          'fixed top-0 right-0 z-50 h-full',
          'glass-strong border-l border-border/50',
          'flex flex-col',
          !isResizing && 'transition-transform duration-300 ease-in-out',
          isNewTaskPanelOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Resize Handle */}
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group">
          <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={closeNewTaskPanel} className="p-1 rounded hover:bg-muted transition-colors" title="Close">
              <ChevronsRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">New AI Task</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onOpenFullTask?.();
                closeNewTaskPanel();
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Open full view"
            >
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={closeNewTaskPanel} className="p-1 rounded hover:bg-muted transition-colors" title="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full text-2xl font-medium text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6"
          />

          {/* Status (Fixed) */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Status</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              Not started
            </div>
          </div>

          {/* Properties */}
          <div className="space-y-3 mb-4">
            {properties.map((property) => (
              <PropertyItem
                key={property.id}
                property={property}
                onRemove={() => removeProperty(property.id)}
                onUpdate={(values) => updateProperty(property.id, values)}
                selectedProvider={properties.find((p) => p.type === 'provider')?.value[0]}
              />
            ))}
          </div>

          {/* Add property (exclude mandatory: project, autoBranch) */}
          <div className="relative" ref={addPropertyRef}>
            <button onClick={() => setShowAddProperty(!showAddProperty)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add a property</span>
            </button>

            {showAddProperty && (
              <div className="absolute top-full left-0 mt-1 w-56 glass border border-white/20 dark:border-white/10 rounded-lg shadow-lg py-1 z-20">
                {propertyTypes
                  .filter((type) => !['project', 'autoBranch', 'provider'].includes(type.id))
                  .map((type) => {
                    const exists = properties.find((p) => p.type === type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => addProperty(type.id as Property['type'])}
                        disabled={!!exists}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                          exists ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-foreground hover:bg-white/20 dark:hover:bg-white/10'
                        )}
                      >
                        <type.icon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Task Requirement */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Task Requirement</h3>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Describe what the AI agent should do..."
              className="w-full h-32 text-sm text-foreground bg-muted/30 border border-border rounded-lg p-3 outline-none resize-none placeholder:text-muted-foreground focus:border-primary/50 transition-colors"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center gap-3">
            <button onClick={closeNewTaskPanel} className="h-9 px-6 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors">
              Cancel
            </button>
            <button onClick={handleCreateTask} className="h-9 px-6 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors">
              Create Task
            </button>
            <button onClick={handleAutoStart} className="h-9 px-4 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4" />
              Auto Start
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
