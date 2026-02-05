import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Plus, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { propertyTypes } from '@/shared/config/property-config';
import { PropertyItem, type Property } from '@/shared/components/layout/floating-panels/property-item';
import { useTaskCreation, useSettings } from '@/shared/hooks';

export const Route = createFileRoute('/tasks/new')({
  component: NewTaskPage,
});

function NewTaskPage() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Initialize with mandatory defaults: project (required), autoBranch (ON)
  const [properties, setProperties] = useState<Property[]>([
    { id: 'project-default', type: 'project', value: [] },
    { id: 'autoBranch-default', type: 'autoBranch', value: ['true'] },
  ]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const addPropertyRef = useRef<HTMLDivElement>(null);

  const { createTask, isPending } = useTaskCreation();

  // Set default project from settings when loaded
  useEffect(() => {
    if (settings?.currentActiveProjectId) {
      setProperties((prev) =>
        prev.map((p) =>
          p.type === 'project' ? { ...p, value: [settings.currentActiveProjectId!] } : p
        )
      );
    }
  }, [settings?.currentActiveProjectId]);

  // Close dropdown on click outside
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

  const addProperty = (type: Property['type']) => {
    if (properties.find((p) => p.type === type)) return;
    setProperties([...properties, { id: Date.now().toString(), type, value: [] }]);
    setShowAddProperty(false);
  };

  const updateProperty = (id: string, values: string[]) => {
    setProperties(properties.map((p) => (p.id === id ? { ...p, value: values } : p)));
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const handleCreate = async () => {
    await createTask({ title, description, properties });
  };

  const handleAutoStart = async () => {
    await createTask({ title, description, properties }, { navigateTo: '/sessions', autoStart: true });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border glass-subtle">
        <button onClick={() => navigate({ to: '/tasks' })} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">New AI Task</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full text-2xl font-medium text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
          />

          {/* Status (Fixed) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Status</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              Not started
            </div>
          </div>

          {/* Properties - using shared PropertyItem component */}
          <div className="space-y-3">
            {properties.map((property) => (
              <PropertyItem
                key={property.id}
                property={property}
                onRemove={() => removeProperty(property.id)}
                onUpdate={(values) => updateProperty(property.id, values)}
                selectedProvider={properties.find((p) => p.type === 'provider')?.value[0]}
                projectId={properties.find((p) => p.type === 'project')?.value[0]}
              />
            ))}
          </div>

          {/* Add Property */}
          <div className="relative" ref={addPropertyRef}>
            <button
              onClick={() => setShowAddProperty(!showAddProperty)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
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

          <div className="border-t border-border my-6" />

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Task Requirement</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the AI agent should do..."
              className="w-full h-40 text-sm text-foreground bg-muted/30 border border-border rounded-lg p-3 outline-none resize-none placeholder:text-muted-foreground focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Footer - matching floating panel buttons */}
      <div className="p-4 border-t border-border glass-subtle">
        <div className="max-w-2xl mx-auto flex items-center justify-end gap-3">
          <button
            onClick={() => navigate({ to: '/tasks' })}
            className="h-9 px-6 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="h-9 px-6 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Create Task
          </button>
          <button
            onClick={handleAutoStart}
            disabled={isPending}
            className="h-9 px-4 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Auto Start
          </button>
        </div>
      </div>
    </div>
  );
}
