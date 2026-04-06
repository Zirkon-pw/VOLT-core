import type { BuiltinPluginModule } from './types';
import { breadcrumbsPlugin } from './breadcrumbs/BreadcrumbsPlugin';
import { fileTreePlugin } from './file-tree/FileTreePlugin';
import { fileViewerPlugin } from './file-viewer/FileViewerPlugin';
import { imageServicePlugin } from './image-service/ImageServicePlugin';
import { linkPreviewPlugin } from './link-preview/LinkPreviewPlugin';
import { searchPlugin } from './search/SearchPlugin';
import { settingsPlugin } from './settings/SettingsPlugin';
import { vaultManagerPlugin } from './vault-manager/VaultManagerPlugin';

export const builtinPlugins: BuiltinPluginModule[] = [
  vaultManagerPlugin,
  settingsPlugin,
  fileTreePlugin,
  breadcrumbsPlugin,
  fileViewerPlugin,
  imageServicePlugin,
  searchPlugin,
  linkPreviewPlugin,
];

const builtinPluginMap = new Map(
  builtinPlugins.map((plugin) => [plugin.manifest.id, plugin] as const),
);

export function getBuiltinPlugin(pluginId: string): BuiltinPluginModule | undefined {
  return builtinPluginMap.get(pluginId);
}

export function isBuiltinPlugin(pluginId: string): boolean {
  return builtinPluginMap.has(pluginId);
}
