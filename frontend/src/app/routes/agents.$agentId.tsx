import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/agents/$agentId')({
  component: AgentDetail,
});

function AgentDetail() {
  const { agentId } = Route.useParams();
  return (
    <div>
      <h1>Agent: {agentId}</h1>
      <p>Agent details</p>
    </div>
  );
}
