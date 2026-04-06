import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';
import { useWorkspaceSlotRegistry } from '@kernel/services/workspaceSlotRegistry';
import { Breadcrumbs } from './ui/Breadcrumbs';

export const breadcrumbsManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-breadcrumbs',
  name: 'Breadcrumbs',
  version: '1.0.0',
  description: 'Built-in breadcrumbs and history navigation for the workspace.',
  main: 'builtin',
  permissions: ['read'],
};

useWorkspaceSlotRegistry.getState().registerSlot('breadcrumbs', Breadcrumbs);

export const breadcrumbsPlugin: BuiltinPluginModule = {
  manifest: breadcrumbsManifest,
};
