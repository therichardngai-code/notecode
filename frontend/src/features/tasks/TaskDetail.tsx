import { useState } from 'react';
import { MessageSquare, Bot, GitBranch, Play, X } from 'lucide-react';
import type { Task } from '../../domain/entities';
import { TaskProperties } from './components/TaskProperties';

interface TaskDetailProps {
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<Task>) => void;
}

export function TaskDetail({ task, onEdit, onDelete, onUpdate }: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'ai-session' | 'diffs'>('activity');

  const handleStartTask = () => {
    onUpdate?.({ status: 'in-progress', startedAt: new Date() });
  };

  const handleCancelTask = () => {
    onUpdate?.({ status: 'cancelled' });
  };

  const handleContinueTask = () => {
    onUpdate?.({ status: 'in-progress' });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">{task.title}</h1>
              <p className="text-muted-foreground">{task.description}</p>
            </div>
            <div className="flex gap-2 ml-4">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-4 py-2 text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Properties</h2>
            <TaskProperties task={task} onUpdate={onUpdate || (() => {})} isEditable={false} />
          </div>

          <div className="border-t border-border my-6" />

          <div>
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'activity'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Activity
              </button>
              <button
                onClick={() => setActiveTab('ai-session')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'ai-session'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Bot className="w-4 h-4" />
                AI Session
              </button>
              <button
                onClick={() => setActiveTab('diffs')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'diffs'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Diffs
              </button>
            </div>

            <div className="min-h-[300px]">
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Task created on {new Date(task.createdAt).toLocaleDateString()}</div>
                  {task.startedAt && (
                    <div className="text-sm text-muted-foreground">Started on {new Date(task.startedAt).toLocaleDateString()}</div>
                  )}
                  {task.completedAt && (
                    <div className="text-sm text-muted-foreground">Completed on {new Date(task.completedAt).toLocaleDateString()}</div>
                  )}
                </div>
              )}

              {activeTab === 'ai-session' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">AI session messages will appear here</p>
                </div>
              )}

              {activeTab === 'diffs' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Code diffs will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          {task.status === 'not-started' ? (
            <button
              onClick={handleStartTask}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : task.status === 'in-progress' ? (
            <button
              onClick={handleCancelTask}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handleContinueTask}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
