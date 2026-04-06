import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const breadcrumbsManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-breadcrumbs',
  name: 'Breadcrumbs',
  version: '1.0.0',
  description: 'Built-in breadcrumbs and history navigation for the workspace.',
  main: 'builtin',
  permissions: ['read'],
};

export const breadcrumbsPlugin: BuiltinPluginModule = {
  manifest: breadcrumbsManifest,
};
