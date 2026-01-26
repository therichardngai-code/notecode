import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/agents')({
  component: Agents,
});

function Agents() {
  return (
    <div>
      <h1>Agents</h1>
      <p>All agents</p>
    </div>
  );
}
