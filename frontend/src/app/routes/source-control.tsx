import { createFileRoute } from '@tanstack/react-router';
import { SourceControlPanel } from '@/features/source-control';

export const Route = createFileRoute('/source-control')({
  component: SourceControlPage,
});

function SourceControlPage() {
  return (
    <div className="h-full">
      <SourceControlPanel />
    </div>
  );
}
