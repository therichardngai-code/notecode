/**
 * Property Row component - read-only display of task property
 */

export interface PropertyRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
}

export function PropertyRow({ icon: Icon, label, value }: PropertyRowProps) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-sidebar/50 hover:bg-sidebar transition-colors">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="text-sm text-foreground truncate">{value}</span>
    </div>
  );
}
