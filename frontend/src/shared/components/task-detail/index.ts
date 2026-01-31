/**
 * Task Detail shared components
 * Used by both FullView (tasks.$taskId.tsx) and FloatingTaskDetailPanel
 */

export { ApprovalCard, type ApprovalCardProps } from './approval-card';
export { StatusBadge, type StatusBadgeProps } from './status-badge';
export { PriorityBadge, type PriorityBadgeProps } from './priority-badge';
export { PropertyRow, type PropertyRowProps } from './property-row';
export { AttemptStats, type AttemptStatsProps } from './attempt-stats';
export { SessionHistory, type SessionHistoryProps } from './session-history';
export { SessionControls, type SessionControlsProps } from './session-controls';
export { GitStatusCard, type GitStatusCardProps } from './git-status-card';
export { DiffFileCard, type DiffFileCardProps, DiffStatsSummary, type DiffStatsSummaryProps } from './diff-file-card';
export { SessionActionsBar, type SessionActionsBarProps } from './session-actions-bar';
export { TaskStatsBar, type TaskStatsBarProps } from './task-stats-bar';
export { SessionListItem, type SessionListItemProps } from './session-list-item';
export { ContextWindowIndicator } from './context-window-indicator';
export { ContextWarningDialog } from './context-warning-dialog';
export * from './tabs';
