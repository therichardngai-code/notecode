import { FileText, Code, Activity } from 'lucide-react';
import type { Session } from '../../../domain/entities';
import { SessionControls } from './SessionControls';
import { SessionStats } from './SessionStats';
import { ScrollArea } from '../../../shared/components/ui';
import { useSessionActions } from '../hooks/useSessionActions';

interface SessionDetailProps {
  session: Session;
}

export function SessionDetail({ session }: SessionDetailProps) {
  const { pauseSession, resumeSession, stopSession, isExecuting } =
    useSessionActions();

  const handlePause = () => pauseSession(session.id);
  const handleResume = () => resumeSession(session.id);
  const handleStop = () => stopSession(session.id);

  return (
    <div className="h-full flex flex-col">
      {/* Session Info Header */}
      <div className="border-b border-border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{session.name}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Code className="w-4 h-4" />
                {session.workingDir}
              </span>
              <span className="px-2 py-1 rounded bg-muted">{session.provider}</span>
              {session.agentId && (
                <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                  Agent: {session.agentId}
                </span>
              )}
            </div>
          </div>
          <SessionControls
            status={session.status}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            disabled={isExecuting}
          />
        </div>

        {/* Session Stats */}
        <SessionStats session={session} />
      </div>

      {/* Session Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* CLI Command */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                CLI Command
              </h3>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                {session.cliCommand}
              </pre>
            </div>

            {/* Model Usage Breakdown */}
            {session.modelUsage.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Model Usage
                </h3>
                <div className="space-y-2">
                  {session.modelUsage.map((usage, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-3 bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{usage.model}</span>
                        <span className="text-sm text-muted-foreground">
                          ${usage.costUsd.toFixed(4)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Input: {usage.inputTokens.toLocaleString()}</div>
                        <div>Output: {usage.outputTokens.toLocaleString()}</div>
                        <div>
                          Cache Read: {usage.cacheReadInputTokens.toLocaleString()}
                        </div>
                        <div>
                          Cache Create:{' '}
                          {usage.cacheCreationInputTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool Usage */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Tool Usage
              </h3>
              <div className="border border-border rounded-lg p-4 bg-card space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Calls:</span>
                  <span className="font-medium">
                    {session.toolStats.totalCalls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful:</span>
                  <span className="font-medium text-green-600">
                    {session.toolStats.totalSuccess}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Web Search:</span>
                  <span className="font-medium">
                    {session.toolStats.webSearchRequests}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Web Fetch:</span>
                  <span className="font-medium">
                    {session.toolStats.webFetchRequests}
                  </span>
                </div>
              </div>
            </div>

            {/* Session Metadata */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Session Info</h3>
              <div className="border border-border rounded-lg p-4 bg-card space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID:</span>
                  <span className="font-mono text-xs">{session.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task ID:</span>
                  <span className="font-mono text-xs">{session.taskId}</span>
                </div>
                {session.providerSessionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider Session:</span>
                    <span className="font-mono text-xs">
                      {session.providerSessionId}
                    </span>
                  </div>
                )}
                {session.processId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Process ID:</span>
                    <span className="font-mono text-xs">{session.processId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{new Date(session.startedAt).toLocaleString()}</span>
                </div>
                {session.endedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ended:</span>
                    <span>{new Date(session.endedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
