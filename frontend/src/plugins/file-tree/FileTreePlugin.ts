import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const fileTreeManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-file-tree',
  name: 'File Tree',
  version: '1.0.0',
  description: 'Built-in workspace file tree sidebar.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

export const fileTreePlugin: BuiltinPluginModule = {
  manifest: fileTreeManifest,
};
