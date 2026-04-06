import type { PluginInfo } from './pluginTypes';
import { pickFiles } from '@shared/api/dialog';
import {
  deleteStorageValue,
  getStorageValue,
  listStorageValues,
  setStorageValue,
} from '@shared/api/storage';

const PLUGIN_NAMESPACE = 'plugins';

export async function listPlugins(): Promise<PluginInfo[]> {
  const entries = await listStorageValues<PluginInfo>(PLUGIN_NAMESPACE);
  return entries
    .map((entry) => entry.value)
    .filter((entry): entry is PluginInfo => (
      entry != null &&
      typeof entry.enabled === 'boolean' &&
      entry.manifest != null &&
      typeof entry.manifest.id === 'string'
    ))
    .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
}

export async function getPluginsDirectory(): Promise<string> {
  return '';
}

export async function pickPluginArchive(): Promise<string> {
  const paths = await pickFiles(
    'Select Plugin Archive',
    [{ displayName: 'ZIP archives (*.zip)', pattern: '*.zip' }],
    false,
  );
  return paths[0] ?? '';
}

export async function importPluginArchive(archivePath: string): Promise<PluginInfo> {
  throw new Error(`Plugin archive import is not available yet for "${archivePath}".`);
}

export async function deletePlugin(pluginId: string): Promise<void> {
  return deleteStorageValue(PLUGIN_NAMESPACE, pluginId);
}

export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  const plugin = await getStorageValue<PluginInfo>(PLUGIN_NAMESPACE, pluginId);
  if (!plugin) {
    throw new Error(`Plugin "${pluginId}" is not available.`);
  }

  await setStorageValue(PLUGIN_NAMESPACE, pluginId, {
    ...plugin,
    enabled,
  });
}
