import { useState } from 'react';
import { ProjectPicker } from './components/ProjectPicker';
import { AgentPicker } from './components/AgentPicker';
import { ContextFilePicker } from './components/ContextFilePicker';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  AgentType,
  ProviderType,
} from '../../domain/entities';

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: string;
  agentRole: AgentType;
  provider: ProviderType;
  model: string;
  projectId: string;
  contextFiles: string[];
}

export function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'not-started',
    priority: task?.priority || 'medium',
    assignee: task?.assignee || '',
    dueDate: task?.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : '',
    agentRole: task?.agentRole || 'coder',
    provider: task?.provider || 'anthropic',
    model: task?.model || 'claude-3-5-sonnet-20241022',
    projectId: task?.projectId || 'default',
    contextFiles: task?.contextFiles || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="not-started">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="agentRole"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Agent Role
          </label>
          <select
            id="agentRole"
            name="agentRole"
            value={formData.agentRole}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="researcher">Researcher</option>
            <option value="planner">Planner</option>
            <option value="coder">Coder</option>
            <option value="reviewer">Reviewer</option>
            <option value="tester">Tester</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Provider
          </label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="assignee"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Assignee
          </label>
          <input
            type="text"
            id="assignee"
            name="assignee"
            value={formData.assignee}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="dueDate"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Due Date
          </label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Project
        </label>
        <ProjectPicker
          value={formData.projectId}
          onChange={(projectId) => setFormData((prev) => ({ ...prev, projectId }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Agent
        </label>
        <AgentPicker
          value={formData.agentRole}
          onChange={(agent) =>
            setFormData((prev) => ({ ...prev, agentRole: agent as AgentType }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Context Files
        </label>
        <ContextFilePicker
          projectId={formData.projectId}
          value={formData.contextFiles}
          onChange={(files) => setFormData((prev) => ({ ...prev, contextFiles: files }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          {task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
