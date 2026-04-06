import { Navigate, useParams } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';

export function PluginSettingsHostPage() {
  const { pluginId } = useParams<{ pluginId: string }>();

  if (!pluginId) {
    return <Navigate to="/settings/plugins" replace />;
  }

  return <SettingsPage section="plugin" pluginId={pluginId} />;
}
