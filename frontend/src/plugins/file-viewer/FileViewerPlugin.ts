import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const fileViewerManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-file-viewer',
  name: 'File Viewer',
  version: '1.0.0',
  description: 'Built-in file viewing surfaces for markdown, text and images.',
  main: 'builtin',
  permissions: ['read'],
};

export const fileViewerPlugin: BuiltinPluginModule = {
  manifest: fileViewerManifest,
};
