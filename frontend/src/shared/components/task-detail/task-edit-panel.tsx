import { Plus, Pencil, Check, Loader2, Calendar, User, Folder } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PropertyItem, type Property } from '@/shared/components/layout/floating-panels/property-item';
import { StatusBadge, PriorityBadge, PropertyRow, AttemptStats } from '@/shared/components/task-detail';
import type { Task } from '@/adapters/api/tasks-api';
import type { TaskDetailProperty } from '@/shared/hooks';
import type { StatusId } from '@/shared/config/task-config';
import { propertyTypes } from '@/shared/config/property-config';
import type { RefObject } from 'react';

interface TaskEditPanelProps {
  isEditing: boolean;
  task: Task;
  projectName: string | null;
  displayProperties: TaskDetailProperty[];
  editTitle: string;
  editDescription: string;
  editProperties: TaskDetailProperty[];
  showAddProperty: boolean;
  isDescriptionExpanded: boolean;
  isUpdating: boolean;
  editFormRef: RefObject<HTMLDivElement | null>;
  addPropertyRef: RefObject<HTMLDivElement | null>;
  taskDetailPropertyTypes: Array<{
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  onSetEditTitle: (title: string) => void;
  onSetEditDescription: (desc: string) => void;
  onSetShowAddProperty: (show: boolean) => void;
  onSetIsDescriptionExpanded: (expanded: boolean) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAddProperty: (type: TaskDetailProperty['type']) => void;
  onRemoveProperty: (id: string) => void;
  onUpdateProperty: (id: string, values: string[]) => void;
  getPropertyIcon: (type: string) => React.ElementType;
  getPropertyDisplayValue: (prop: TaskDetailProperty) => string | undefined;
}

export function TaskEditPanel({
  isEditing,
  task,
  projectName,
  displayProperties,
  editTitle,
  editDescription,
  editProperties,
  showAddProperty,
  isDescriptionExpanded,
  isUpdating,
  editFormRef,
  addPropertyRef,
  taskDetailPropertyTypes,
  onSetEditTitle,
  onSetEditDescription,
  onSetShowAddProperty,
  onSetIsDescriptionExpanded,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAddProperty,
  onRemoveProperty,
  onUpdateProperty,
  getPropertyIcon,
  getPropertyDisplayValue,
}: TaskEditPanelProps) {
  return (
    <>
      {isEditing ? (
        /* Edit Mode */
        <div ref={editFormRef}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onSetEditTitle(e.target.value)}
            className="w-full text-2xl font-medium text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6"
            placeholder="Task title"
          />

          {/* Editable Properties - using shared PropertyItem */}
          <div className="space-y-3 mb-4">
            {editProperties
              .filter((p) => p.type !== 'status' && p.type !== 'project' && p.type !== 'provider') // Status handled separately, Project/Provider not editable
              .map((property) => (
                <PropertyItem
                  key={property.id}
                  property={property as Property}
                  onRemove={() => onRemoveProperty(property.id)}
                  onUpdate={(values) => onUpdateProperty(property.id, values)}
                  selectedProvider={task.provider ?? undefined}
                  projectId={task.projectId ?? undefined}
                />
              ))}
          </div>

          {/* Add Property (exclude: project, provider, autoBranch) */}
          <div className="relative mb-4" ref={addPropertyRef}>
            <button
              onClick={() => onSetShowAddProperty(!showAddProperty)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add a property</span>
            </button>

            {showAddProperty && (
              <div className="absolute top-full left-0 mt-1 w-56 glass border border-border rounded-lg shadow-lg py-1 z-20">
                {taskDetailPropertyTypes
                  .filter((type) => !['project', 'provider', 'autoBranch'].includes(type.id))
                  .map((type) => {
                    const exists = editProperties.find((p) => p.type === type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          onAddProperty(type.id as TaskDetailProperty['type']);
                          onSetShowAddProperty(false);
                        }}
                        disabled={!!exists}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                          exists ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-popover-foreground hover:bg-accent'
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
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Description</h3>
            <textarea
              value={editDescription}
              onChange={(e) => onSetEditDescription(e.target.value)}
              className="w-full h-32 text-sm text-foreground bg-muted/30 border border-border rounded-lg p-3 outline-none resize-none placeholder:text-muted-foreground focus:border-primary/50 transition-colors"
              placeholder="Describe the task details..."
            />
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={onSaveEdit}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <>
          <h1 className="text-2xl font-medium text-foreground mb-2">{task.title}</h1>

          {/* Description */}
          {task.description && (
            <div className="mb-6 overflow-hidden">
              <p className={cn("text-sm text-muted-foreground break-words", !isDescriptionExpanded && "line-clamp-2")}>{task.description}</p>
              {task.description.length > 100 && (
                <button onClick={() => onSetIsDescriptionExpanded(!isDescriptionExpanded)} className="text-xs text-primary hover:underline mt-1">
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Status & Priority & Attempts & Edit button */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {projectName && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="w-3 h-3" />{projectName}</span>}
            <StatusBadge status={task.status as StatusId} />
            <PriorityBadge priority={task.priority} />
            <AttemptStats
              totalAttempts={task.totalAttempts ?? 0}
              renewCount={task.renewCount ?? 0}
              retryCount={task.retryCount ?? 0}
              forkCount={task.forkCount ?? 0}
            />
            <button onClick={onStartEdit} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3 h-3" />Edit
            </button>
          </div>

          {/* Properties (read-only) - 1 Project + 2 max Properties visible, scroll for rest */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Properties</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[108px] overflow-y-auto divide-y divide-border">
                <PropertyRow icon={Folder} label="Project" value={projectName || undefined} />
                {displayProperties
                  .filter((p) => p.type !== 'status' && p.type !== 'project')
                  .map((prop) => (
                    <PropertyRow
                      key={prop.id}
                      icon={getPropertyIcon(prop.type)}
                      label={propertyTypes.find((t) => t.id === prop.type)?.label || prop.type}
                      value={getPropertyDisplayValue(prop)}
                    />
                  ))}
                <PropertyRow icon={User} label="Assignee" value={task.assignee || undefined} />
                <PropertyRow icon={Calendar} label="Due Date" value={task.dueDate || undefined} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
