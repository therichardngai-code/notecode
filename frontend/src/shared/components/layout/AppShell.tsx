import type { ReactNode } from 'react';
import { UpdateBanner } from '../UpdateBanner';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <UpdateBanner />
      {children}
    </div>
  );
}
