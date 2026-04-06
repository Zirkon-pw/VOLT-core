import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const linkPreviewManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-link-preview',
  name: 'Link Preview',
  version: '1.0.0',
  description: 'Built-in link preview resolution and card rendering.',
  main: 'builtin',
  permissions: ['external'],
};

export const linkPreviewPlugin: BuiltinPluginModule = {
  manifest: linkPreviewManifest,
};
