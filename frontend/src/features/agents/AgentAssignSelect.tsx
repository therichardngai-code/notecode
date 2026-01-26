import { useState, useEffect } from 'react';
import type { Agent } from '../../domain/entities';

interface AgentAssignSelectProps {
  value?: string;
  onChange: (agentId: string) => void;
  className?: string;
  placeholder?: string;
}

export function AgentAssignSelect({
  value,
  onChange,
  className = '',
  placeholder = 'Select an agent',
}: AgentAssignSelectProps) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    // TODO: Load from agent repository
    const stored = localStorage.getItem('agents');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAgents(
          parsed.map((a: Agent) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
          }))
        );
      } catch (e) {
        console.error('Failed to load agents', e);
      }
    }
  }, []);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name} ({agent.role})
        </option>
      ))}
    </select>
  );
}
