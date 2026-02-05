import { useState } from 'react';
import type { Agent, AgentType } from '../../domain/entities';

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
}

export interface AgentFormData {
  name: string;
  role: AgentType;
  description?: string;
  focusAreas: string[];
  defaultSkills: string[];
  injectPreviousSummaries: boolean;
  maxSummariesToInject: number;
}

const agentRoles: Array<{ value: AgentType; label: string; description: string }> = [
  { value: 'researcher', label: 'Researcher', description: 'Gathers information and context' },
  { value: 'planner', label: 'Planner', description: 'Creates implementation plans' },
  { value: 'coder', label: 'Coder', description: 'Writes and modifies code' },
  { value: 'reviewer', label: 'Reviewer', description: 'Reviews code quality' },
  { value: 'tester', label: 'Tester', description: 'Writes and runs tests' },
];

export function AgentForm({ agent, onSubmit, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: agent?.name || '',
    role: agent?.role || 'coder',
    description: agent?.description || '',
    focusAreas: agent?.focusAreas || [],
    defaultSkills: agent?.defaultSkills || [],
    injectPreviousSummaries: agent?.injectPreviousSummaries ?? true,
    maxSummariesToInject: agent?.maxSummariesToInject ?? 5,
  });

  const [focusInput, setFocusInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddFocusArea = () => {
    if (focusInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        focusAreas: [...prev.focusAreas, focusInput.trim()],
      }));
      setFocusInput('');
    }
  };

  const handleRemoveFocusArea = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.filter((_, i) => i !== index),
    }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        defaultSkills: [...prev.defaultSkills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      defaultSkills: prev.defaultSkills.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Agent Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Frontend Developer"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
            Role *
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as AgentType })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {agentRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the agent's purpose and capabilities"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Focus Areas</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={focusInput}
            onChange={(e) => setFocusInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocusArea())}
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add focus area (e.g., React, TypeScript)"
          />
          <button
            type="button"
            onClick={handleAddFocusArea}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.focusAreas.map((area, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
            >
              {area}
              <button
                type="button"
                onClick={() => handleRemoveFocusArea(index)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Default Skills</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add skill (e.g., debugging, ui-design)"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.defaultSkills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(index)}
                className="hover:text-green-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Summary Injection</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.injectPreviousSummaries}
              onChange={(e) =>
                setFormData({ ...formData, injectPreviousSummaries: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-foreground">Inject previous session summaries</span>
          </label>

          {formData.injectPreviousSummaries && (
            <div>
              <label
                htmlFor="maxSummaries"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Max summaries to inject
              </label>
              <input
                type="number"
                id="maxSummaries"
                min="1"
                max="20"
                value={formData.maxSummariesToInject}
                onChange={(e) =>
                  setFormData({ ...formData, maxSummariesToInject: parseInt(e.target.value) })
                }
                className="w-32 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
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
          {agent ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
}
