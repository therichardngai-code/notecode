import { createFileRoute } from '@tanstack/react-router';
import { NotificationList } from '@/features/inbox';

export const Route = createFileRoute('/inbox')({
  component: InboxPage,
});

function InboxPage() {
  return (
    <div className="h-full">
      <NotificationList />
    </div>
  );
}
