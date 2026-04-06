import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';
import { registerFileTreeStore } from '@kernel/services/fileTreeService';
import { useWorkspaceSlotRegistry } from '@kernel/services/workspaceSlotRegistry';
import { useFileTreeStore } from './model';
import { Sidebar } from './ui/sidebar/Sidebar';

export const fileTreeManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-file-tree',
  name: 'File Tree',
  version: '1.0.0',
  description: 'Built-in workspace file tree sidebar.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

registerFileTreeStore(useFileTreeStore);
useWorkspaceSlotRegistry.getState().registerSlot('sidebar', Sidebar);

export const fileTreePlugin: BuiltinPluginModule = {
  manifest: fileTreeManifest,
};
