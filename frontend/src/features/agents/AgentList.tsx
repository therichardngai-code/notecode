import { useState, useEffect } from 'react';
import type { Agent } from '../../domain/entities';

interface AgentListProps {
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onCreate: () => void;
  onViewSummaries: (agent: Agent) => void;
}

export function AgentList({ onEdit, onDelete, onCreate, onViewSummaries }: AgentListProps) {
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

  const roleColors: Record<string, string> = {
    researcher: 'bg-purple-100 text-purple-700',
    planner: 'bg-blue-100 text-blue-700',
    coder: 'bg-green-100 text-green-700',
    reviewer: 'bg-orange-100 text-orange-700',
    tester: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage AI agents with specialized roles and configurations.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No agents created yet.</p>
          <button onClick={onCreate} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
            Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded mt-1 ${
                      roleColors[agent.role] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {agent.role}
                  </span>
                </div>
              </div>

              {agent.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{agent.description}</p>
              )}

              <div className="space-y-2 text-xs text-gray-500 mb-4">
                {agent.focusAreas.length > 0 && (
                  <div>
                    <span className="font-medium">Focus:</span> {agent.focusAreas.join(', ')}
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Sessions: {agent.totalSessions}</span>
                  <span>Tokens: {agent.totalTokensUsed.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(agent)}
                  className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => onViewSummaries(agent)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                >
                  Summaries
                </button>
                <button
                  onClick={() => onDelete(agent.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
