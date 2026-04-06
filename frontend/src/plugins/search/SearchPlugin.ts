import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';
import { useWorkspaceSlotRegistry } from '@kernel/services/workspaceSlotRegistry';
import { useSearchService } from '@kernel/services/searchService';
import { searchFiles } from './SearchService';
import { SearchPopup } from './ui/SearchPopup';

export const searchManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-search',
  name: 'Search',
  version: '1.0.0',
  description: 'Built-in workspace search and command palette.',
  main: 'builtin',
  permissions: ['read'],
};

useSearchService.getState().register({ searchFiles });
useWorkspaceSlotRegistry.getState().registerSlot('search-popup', SearchPopup);

export const searchPlugin: BuiltinPluginModule = {
  manifest: searchManifest,
};
