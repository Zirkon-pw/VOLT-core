import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@plugins/types';

export const imageServiceManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-image-service',
  name: 'Image Service',
  version: '1.0.0',
  description: 'Built-in image selection and asset handling service.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

export const imageServicePlugin: BuiltinPluginModule = {
  manifest: imageServiceManifest,
};
