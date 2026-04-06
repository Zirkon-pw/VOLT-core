import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';

export const vaultManagerManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-vault-manager',
  name: 'Vault Manager',
  version: '1.0.0',
  description: 'Built-in vault management for the home screen.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

export const vaultManagerPlugin: BuiltinPluginModule = {
  manifest: vaultManagerManifest,
};
