import { createFileRoute } from '@tanstack/react-router';
import { SettingsContainer } from '../../features/settings';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

function Settings() {
  return <SettingsContainer />;
}
