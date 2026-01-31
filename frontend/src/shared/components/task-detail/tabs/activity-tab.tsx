import { memo } from 'react';
import { MessageSquare, User, GitBranch, Bot, CheckCircle, X, Check } from 'lucide-react';
import type { Session } from '@/adapters/api/sessions-api';
import type { Task } from '@/adapters/api/tasks-api';
import type { GitCommitApproval } from '@/adapters/api/git-api';

interface ActivityTabProps {
  task: Task;
  sessions: Session[];
  gitCommitApprovals: GitCommitApproval[];
}

export const ActivityTab = memo(function ActivityTab({
  task,
  sessions,
  gitCommitApprovals,
}: ActivityTabProps) {
  // Build activity timeline from existing data
  type ActivityItem = { type: string; date: Date; data?: Record<string, unknown> };
  const activities: ActivityItem[] = [];

  // Task created
  if (task.createdAt) {
    activities.push({ type: 'task_created', date: new Date(task.createdAt) });
  }

  // Branch created (use branchCreatedAt field)
  if (task.branchName && task.branchCreatedAt) {
    activities.push({ type: 'branch_created', date: new Date(task.branchCreatedAt), data: { branch: task.branchName } });
  }

  // Sessions started/completed/failed
  sessions.forEach(s => {
    activities.push({ type: 'session_started', date: new Date(s.createdAt), data: { attempt: s.attemptNumber, mode: s.resumeMode, status: s.status } });
    if (s.status === 'completed' && s.endedAt) {
      activities.push({ type: 'session_completed', date: new Date(s.endedAt), data: { attempt: s.attemptNumber } });
    }
    if (s.status === 'failed' && s.endedAt) {
      activities.push({ type: 'session_failed', date: new Date(s.endedAt), data: { attempt: s.attemptNumber } });
    }
  });

  // Git commit approval events
  gitCommitApprovals.forEach(approval => {
    // Commit approval requested
    activities.push({
      type: 'commit_approval_requested',
      date: new Date(approval.createdAt),
      data: { message: approval.commitMessage, files: approval.filesChanged.length, id: approval.id }
    });
    // Commit approved/rejected
    if (approval.resolvedAt && approval.status === 'approved') {
      activities.push({
        type: 'commit_approved',
        date: new Date(approval.resolvedAt),
        data: { message: approval.commitMessage, sha: approval.commitSha }
      });
    } else if (approval.resolvedAt && approval.status === 'rejected') {
      activities.push({
        type: 'commit_rejected',
        date: new Date(approval.resolvedAt),
        data: { message: approval.commitMessage }
      });
    }
  });

  // Task completed
  if (task.status === 'done' && task.completedAt) {
    activities.push({ type: 'task_completed', date: new Date(task.completedAt) });
  }

  // Sort by date (newest first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (activities.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((act, idx) => {
        if (act.type === 'task_created') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3 h-3 text-muted-foreground" /></div>
              <div><p className="text-foreground"><span className="font-medium">Task created</span></p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        if (act.type === 'branch_created') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-blue-500" /></div>
              <div><p className="text-foreground"><span className="font-medium">Branch created:</span> {act.data?.branch as string}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        if (act.type === 'session_started') {
          const mode = act.data?.mode as string | undefined;
          const modeLabel = mode ? ` (${mode})` : '';
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3 h-3 text-purple-500" /></div>
              <div><p className="text-foreground"><span className="font-medium">Session started</span> #{act.data?.attempt as number}{modeLabel}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        if (act.type === 'session_completed') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3 h-3 text-green-500" /></div>
              <div><p className="text-foreground"><span className="font-medium">Session completed</span> #{act.data?.attempt as number}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        if (act.type === 'session_failed') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><X className="w-3 h-3 text-red-500" /></div>
              <div><p className="text-foreground"><span className="font-medium">Session failed</span> #{act.data?.attempt as number}</p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        if (act.type === 'commit_approval_requested') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-yellow-500" /></div>
              <div>
                <p className="text-foreground"><span className="font-medium">Commit approval requested</span></p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{(act.data?.message as string) || 'No message'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(act.date)}</p>
              </div>
            </div>
          );
        }
        if (act.type === 'commit_approved') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-green-500" /></div>
              <div>
                <p className="text-foreground"><span className="font-medium">Commit approved</span></p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{(act.data?.message as string) || 'No message'}</p>
                {act.data?.sha ? <p className="text-xs text-muted-foreground font-mono">{(act.data.sha as string).slice(0, 7)}</p> : null}
                <p className="text-xs text-muted-foreground">{formatDate(act.date)}</p>
              </div>
            </div>
          );
        }
        if (act.type === 'commit_rejected') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><X className="w-3 h-3 text-red-500" /></div>
              <div>
                <p className="text-foreground"><span className="font-medium">Commit rejected</span></p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{(act.data?.message as string) || 'No message'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(act.date)}</p>
              </div>
            </div>
          );
        }
        if (act.type === 'task_completed') {
          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3 h-3 text-green-500" /></div>
              <div><p className="text-foreground"><span className="font-medium">Task completed</span></p><p className="text-xs text-muted-foreground">{formatDate(act.date)}</p></div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});
