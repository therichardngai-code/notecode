import type { HookEvent } from '../../domain/value-objects';

interface HookEventSelectProps {
  value: HookEvent;
  onChange: (event: HookEvent) => void;
  className?: string;
}

const hookEvents: Array<{ value: HookEvent; label: string; description: string }> = [
  {
    value: 'session:start',
    label: 'Session Start',
    description: 'Triggered when a new session begins',
  },
  {
    value: 'session:end',
    label: 'Session End',
    description: 'Triggered when a session ends',
  },
  {
    value: 'message:before',
    label: 'Before Message',
    description: 'Triggered before processing a message',
  },
  {
    value: 'message:after',
    label: 'After Message',
    description: 'Triggered after processing a message',
  },
  {
    value: 'tool:before',
    label: 'Before Tool',
    description: 'Triggered before executing a tool',
  },
  {
    value: 'tool:after',
    label: 'After Tool',
    description: 'Triggered after executing a tool',
  },
  {
    value: 'approval:pending',
    label: 'Approval Pending',
    description: 'Triggered when an approval is pending',
  },
];

export function HookEventSelect({ value, onChange, className = '' }: HookEventSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as HookEvent)}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {hookEvents.map((event) => (
        <option key={event.value} value={event.value} title={event.description}>
          {event.label}
        </option>
      ))}
    </select>
  );
}
