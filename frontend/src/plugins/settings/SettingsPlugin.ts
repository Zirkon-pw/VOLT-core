import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const settingsManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-settings',
  name: 'Settings',
  version: '1.0.0',
  description: 'Built-in application settings and plugin configuration pages.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

export const settingsPlugin: BuiltinPluginModule = {
  manifest: settingsManifest,
};
