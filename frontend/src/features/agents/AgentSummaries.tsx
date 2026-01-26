import { useState, useEffect } from 'react';
import type { Agent, AgentSummary } from '../../domain/entities';

interface AgentSummariesProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentSummaries({ agent, onClose }: AgentSummariesProps) {
  const [summaries, setSummaries] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Load from agent repository
    const stored = localStorage.getItem(`agent-summaries-${agent.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSummaries(
          parsed.map((s: AgentSummary) => ({
            ...s,
            extractedAt: new Date(s.extractedAt),
            createdAt: new Date(s.createdAt),
          }))
        );
      } catch (e) {
        console.error('Failed to load summaries', e);
      }
    }
    setLoading(false);
  }, [agent.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading summaries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{agent.name} - Summaries</h2>
          <p className="text-sm text-gray-600 mt-1">
            Session summaries from {agent.name}'s previous work
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No summaries available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Summaries will appear here after {agent.name} completes sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <div key={summary.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      Session: {summary.sessionId.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {summary.extractedAt.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {summary.tokenCount.toLocaleString()} tokens
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Summary</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary.summary}</p>
                </div>

                {summary.keyDecisions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Key Decisions</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {summary.keyDecisions.map((decision, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.filesModified.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Files Modified</h4>
                    <div className="flex flex-wrap gap-1">
                      {summary.filesModified.map((file, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-mono"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
