/**
 * Context Window Indicator Component
 * Displays real-time context window usage with visual progress bar
 * Memoized to prevent re-renders on parent state changes
 */

import { memo } from 'react';
import type { ContextWindowUsage } from '@/domain/entities/session';
import { PROVIDER_CONTEXT_CONFIG } from '@/shared/constants/provider-config';
import { cn } from '@/shared/lib/utils';

interface Props {
  contextWindow?: ContextWindowUsage | null;
}

export const ContextWindowIndicator = memo(function ContextWindowIndicator({ contextWindow }: Props) {
  if (!contextWindow) return null;

  const { contextPercent, totalContextTokens, contextSize, provider } = contextWindow;
  const config = PROVIDER_CONTEXT_CONFIG[provider];

  // Determine status based on thresholds
  const status = contextPercent >= config.criticalThreshold
    ? 'critical'
    : contextPercent >= config.warningThreshold
    ? 'warning'
    : 'normal';

  const colorClasses = status === 'critical'
    ? 'bg-red-500 text-red-500'
    : status === 'warning'
    ? 'bg-yellow-500 text-yellow-600'
    : 'bg-green-500 text-green-600';

  const bgColorClass = status === 'critical'
    ? 'bg-red-500/20'
    : status === 'warning'
    ? 'bg-yellow-500/20'
    : 'bg-green-500/20';

  const statusText = status === 'critical'
    ? 'Context window nearly full'
    : status === 'warning'
    ? 'Context window filling up'
    : 'Context window healthy';

  return (
    <div className="group relative flex items-center gap-1.5">
      {/* Progress Bar */}
      <div className={cn("relative w-20 h-2 rounded-full overflow-hidden", bgColorClass)}>
        <div
          className={cn("h-full transition-all duration-300", colorClasses.split(' ')[0])}
          style={{ width: `${contextPercent}%` }}
        />
      </div>

      {/* Percentage */}
      <span className={cn("text-xs font-medium min-w-[32px]", colorClasses.split(' ')[1])}>
        {contextPercent}%
      </span>

      {/* Tooltip */}
      <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md border border-border whitespace-nowrap z-50">
        <div className="font-semibold mb-1">{config.displayName} Context Window</div>
        <div className="text-muted-foreground">
          {totalContextTokens.toLocaleString()} / {contextSize.toLocaleString()} tokens
        </div>
        <div className="text-muted-foreground mt-1">{statusText}</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
      </div>
    </div>
  );
});
