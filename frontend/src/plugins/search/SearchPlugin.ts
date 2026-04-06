import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const searchManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-search',
  name: 'Search',
  version: '1.0.0',
  description: 'Built-in workspace search and command palette.',
  main: 'builtin',
  permissions: ['read'],
};

export const searchPlugin: BuiltinPluginModule = {
  manifest: searchManifest,
};
