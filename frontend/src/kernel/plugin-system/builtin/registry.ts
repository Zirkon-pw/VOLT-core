import type { BuiltinPluginModule } from './types';
import { breadcrumbsPlugin } from '@plugins/breadcrumbs/BreadcrumbsPlugin';
import { fileTreePlugin } from '@plugins/file-tree/FileTreePlugin';
import { fileViewerPlugin } from '@plugins/file-viewer/FileViewerPlugin';
import { imageServicePlugin } from '@plugins/image-service/ImageServicePlugin';
import { linkPreviewPlugin } from '@plugins/link-preview/LinkPreviewPlugin';
import { searchPlugin } from '@plugins/search/SearchPlugin';
import { settingsPlugin } from '@plugins/settings/SettingsPlugin';
import { vaultManagerPlugin } from '@plugins/vault-manager/VaultManagerPlugin';

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
