import { useState, useRef, useEffect } from 'react';
import {
  Folder,
  Bot,
  Sparkles,
  Zap,
  Wrench,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Task } from '../../../domain/entities';

interface TaskPropertiesProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  isEditable?: boolean;
}

const propertyTypes = [
  { id: 'project', label: 'Project', icon: Folder },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'provider', label: 'Provider', icon: Sparkles },
  { id: 'model', label: 'Model', icon: Zap },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'context', label: 'Context', icon: FolderOpen },
  { id: 'priority', label: 'Priority', icon: Zap },
  { id: 'status', label: 'Status', icon: Zap },
] as const;

const agentOptions = [
  { id: 'researcher', label: 'Researcher' },
  { id: 'planner', label: 'Planner' },
  { id: 'coder', label: 'Coder' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'tester', label: 'Tester' },
];

const providerOptions = [
  { id: 'anthropic', label: 'Claude (Anthropic)' },
  { id: 'google', label: 'Gemini (Google)' },
  { id: 'openai', label: 'Codex (OpenAI)' },
];

const priorityOptions = [
  { id: 'high', label: 'High', color: '#C15746' },
  { id: 'medium', label: 'Medium', color: '#C69F3A' },
  { id: 'low', label: 'Low', color: '#447FC1' },
];

const statusOptions = [
  { id: 'not-started', label: 'Not Started', color: '#787774' },
  { id: 'in-progress', label: 'In Progress', color: '#447FC1' },
  { id: 'review', label: 'Review', color: '#C69F3A' },
  { id: 'done', label: 'Done', color: '#4B9064' },
  { id: 'cancelled', label: 'Cancelled', color: '#C15746' },
  { id: 'archived', label: 'Archived', color: '#55534E' },
];

export function TaskProperties({ task, isEditable = false }: TaskPropertiesProps) {
  const [visibleProperties, setVisibleProperties] = useState<string[]>([
    'status',
    'project',
    'agent',
    'provider',
    'priority',
  ]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const addPropertyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addPropertyRef.current && !addPropertyRef.current.contains(e.target as Node)) {
        setShowAddProperty(false);
      }
    };
    if (showAddProperty) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddProperty]);

  const addProperty = (propertyId: string) => {
    if (!visibleProperties.includes(propertyId)) {
      setVisibleProperties([...visibleProperties, propertyId]);
    }
    setShowAddProperty(false);
  };

  const removeProperty = (propertyId: string) => {
    setVisibleProperties(visibleProperties.filter((p) => p !== propertyId));
  };

  return (
    <div className="space-y-3">
      {visibleProperties.map((propId) => {
        const propType = propertyTypes.find((p) => p.id === propId);
        if (!propType) return null;

        const Icon = propType.icon;

        return (
          <div key={propId} className="flex items-center gap-3 group">
            <div className="flex items-center gap-2 w-24 text-sm text-gray-500">
              <Icon className="w-4 h-4" />
              <span>{propType.label}</span>
            </div>
            <div className="flex-1">
              {propId === 'project' && (
                <span className="text-sm">{task.projectId}</span>
              )}
              {propId === 'agent' && (
                <span className="text-sm">
                  {agentOptions.find((a) => a.id === task.agentRole)?.label || task.agentRole}
                </span>
              )}
              {propId === 'provider' && (
                <span className="text-sm">
                  {providerOptions.find((p) => p.id === task.provider)?.label || task.provider}
                </span>
              )}
              {propId === 'model' && <span className="text-sm">{task.model}</span>}
              {propId === 'priority' && (
                <span className="text-sm">
                  {priorityOptions.find((p) => p.id === task.priority)?.label || task.priority}
                </span>
              )}
              {propId === 'status' && (
                <span className="text-sm">
                  {statusOptions.find((s) => s.id === task.status)?.label || task.status}
                </span>
              )}
              {propId === 'skills' && (
                <div className="flex flex-wrap gap-1">
                  {task.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {propId === 'context' && (
                <div className="flex flex-wrap gap-1">
                  {task.contextFiles.map((file) => (
                    <span
                      key={file}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isEditable && propId !== 'status' && (
              <button
                onClick={() => removeProperty(propId)}
                className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
          </div>
        );
      })}

      {isEditable && (
        <div className="relative" ref={addPropertyRef}>
          <button
            onClick={() => setShowAddProperty(!showAddProperty)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add a property</span>
          </button>

          {showAddProperty && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              {propertyTypes.map((type) => {
                const exists = visibleProperties.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => addProperty(type.id)}
                    disabled={exists}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                      exists
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">{type.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
