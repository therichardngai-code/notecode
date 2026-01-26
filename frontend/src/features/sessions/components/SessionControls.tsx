import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import type { SessionStatus } from '../../../domain/entities';
import { Button } from '../../../shared/components/ui';
import { cn } from '../../../shared/lib/utils';

interface SessionControlsProps {
  status: SessionStatus;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

const statusIndicatorColors = {
  queued: 'bg-blue-500',
  running: 'bg-green-500 animate-pulse',
  paused: 'bg-yellow-500',
  completed: 'bg-purple-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
  archived: 'bg-gray-400',
};

export function SessionControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: SessionControlsProps) {
  const canStart = status === 'queued' && onStart;
  const canPause = status === 'running' && onPause;
  const canResume = status === 'paused' && onResume;
  const canStop = (status === 'running' || status === 'paused') && onStop;

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn('w-2 h-2 rounded-full', statusIndicatorColors[status])}
        />
        <span className="text-sm font-medium capitalize">{status}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {canStart && (
          <Button
            variant="default"
            size="sm"
            onClick={onStart}
            disabled={disabled}
            className="gap-1"
          >
            <Play className="w-4 h-4" />
            Start
          </Button>
        )}

        {canResume && (
          <Button
            variant="default"
            size="sm"
            onClick={onResume}
            disabled={disabled}
            className="gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Resume
          </Button>
        )}

        {canPause && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            disabled={disabled}
            className="gap-1"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
        )}

        {canStop && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStop}
            disabled={disabled}
            className="gap-1"
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
