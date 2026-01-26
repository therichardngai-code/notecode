import { createFileRoute } from '@tanstack/react-router';
import { AIChatView } from '@/features/chat';

export const Route = createFileRoute('/chat')({
  component: ChatPage,
});

function ChatPage() {
  return <AIChatView />;
}
