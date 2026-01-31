import { Bot, MessageSquare, GitBranch, Clock, Maximize2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session } from '@/adapters/api/sessions-api';

interface TaskInfoTabsNavProps {
  activeTab: 'activity' | 'ai-session' | 'diffs' | 'sessions';
  latestSession?: Session;
  sessionsCount: number;
  onTabChange: (tab: 'activity' | 'ai-session' | 'diffs' | 'sessions') => void;
  onExpandToSubPanel?: () => void;
}

export function TaskInfoTabsNav({
  activeTab,
  latestSession,
  sessionsCount,
  onTabChange,
  onExpandToSubPanel,
}: TaskInfoTabsNavProps) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-border">
      <button onClick={() => onTabChange('activity')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === 'activity' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
        <MessageSquare className="w-4 h-4" />Activity
      </button>
      <button onClick={() => onTabChange('ai-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === 'ai-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
        <Bot className="w-4 h-4" />AI Session
      </button>
      <button onClick={() => onTabChange('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
        <GitBranch className="w-4 h-4" />Diffs
      </button>
      {/* Sessions Tab with status indicator */}
      <button onClick={() => onTabChange('sessions')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === 'sessions' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
        {latestSession?.status === 'running' ? (
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        ) : latestSession?.status === 'queued' ? (
          <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
        ) : latestSession?.status === 'paused' ? (
          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
        ) : latestSession?.status === 'completed' ? (
          <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
        ) : latestSession?.status === 'failed' ? (
          <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
        ) : latestSession?.status === 'cancelled' ? (
          <span className="w-2 h-2 rounded-full bg-gray-500 mr-1" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        Sessions
        {sessionsCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({sessionsCount})</span>}
      </button>
      {/* Expand to sub-panel button */}
      {onExpandToSubPanel && (
        <button
          onClick={onExpandToSubPanel}
          className="ml-auto p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Expand to panel"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
