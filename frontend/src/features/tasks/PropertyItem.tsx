import type { ReactNode } from 'react';

interface PropertyItemProps {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

export function PropertyItem({
  label,
  value,
  fullWidth = false,
}: PropertyItemProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}
