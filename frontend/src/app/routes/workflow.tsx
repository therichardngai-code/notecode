import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/workflow')({
  component: Workflow,
});

function Workflow() {
  return (
    <div>
      <h1>Workflow</h1>
      <p>7-stage workflow visualization</p>
    </div>
  );
}
