import { createFileRoute, Outlet } from '@tanstack/react-router';

// Layout route for /tasks/* - renders child routes via Outlet
// - /tasks → tasks.index.tsx (Board/Sessions view)
// - /tasks/:taskId → tasks.$taskId.tsx (Task detail view)
export const Route = createFileRoute('/tasks')({
  component: TasksLayout,
});

function TasksLayout() {
  return <Outlet />;
}
