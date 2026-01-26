import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {children}
    </div>
  );
}
