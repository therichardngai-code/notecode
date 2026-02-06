import type { ReactNode } from 'react';
import { UpdateDialog } from '../update-dialog';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <UpdateDialog />
      {children}
    </div>
  );
}
