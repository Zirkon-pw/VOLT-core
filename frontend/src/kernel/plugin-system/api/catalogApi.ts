import type { PluginInfo, PluginManifest } from './pluginTypes';
import { pickFiles } from '@shared/api/dialog';
import {
  clearStorageNamespace,
  getStorageConfigDir,
  deleteStorageValue,
  listStorageValues,
  setStorageValue,
} from '@shared/api/storage';
import { createDirectory, deletePath, listTree, readFile } from '@shared/api/file';

const PLUGIN_NAMESPACE = 'plugins';
let pluginCache: PluginInfo[] = [];

interface StoredPluginState {
  enabled?: boolean;
}

function joinSystemPath(basePath: string, childPath: string): string {
  if (!basePath) {
    return childPath;
  }

  const separator = basePath.includes('\\') && !basePath.includes('/') ? '\\' : '/';
  return `${basePath.replace(/[\\/]+$/, '')}${separator}${childPath.replace(/^[\\/]+/, '')}`;
}

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error && /already exists/i.test(error.message);
}

function isPluginManifest(value: unknown): value is PluginManifest {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<PluginManifest>;
  return (
    typeof manifest.id === 'string'
    && typeof manifest.name === 'string'
    && typeof manifest.version === 'string'
    && typeof manifest.main === 'string'
    && Array.isArray(manifest.permissions)
  );
}

function resolveEnabledState(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }

  if (raw != null && typeof raw === 'object' && typeof (raw as StoredPluginState).enabled === 'boolean') {
    return (raw as StoredPluginState).enabled ?? false;
  }

  return false;
}

async function ensurePluginsDirectory(): Promise<string> {
  const configDir = await getStorageConfigDir();
  const pluginsDir = joinSystemPath(configDir, 'plugins');

  try {
    await createDirectory(configDir, 'plugins');
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }

  return pluginsDir;
}

function updatePluginCache(plugins: PluginInfo[]): PluginInfo[] {
  pluginCache = [...plugins].sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
  return pluginCache;
}

export async function listPlugins(): Promise<PluginInfo[]> {
  const pluginsDir = await ensurePluginsDirectory();
  const [entries, storedStates] = await Promise.all([
    listTree(pluginsDir).catch(() => []),
    listStorageValues<unknown>(PLUGIN_NAMESPACE),
  ]);
  const stateById = new Map(storedStates.map((entry) => [entry.key, entry.value] as const));

  const plugins = await Promise.all(entries
    .filter((entry) => entry.isDir)
    .map(async (entry) => {
      try {
        const rawManifest = await readFile(pluginsDir, `${entry.path}/manifest.json`);
        const manifest = JSON.parse(rawManifest) as unknown;
        if (!isPluginManifest(manifest)) {
          return null;
        }

        return {
          manifest,
          enabled: resolveEnabledState(stateById.get(manifest.id)),
          dirPath: joinSystemPath(pluginsDir, entry.path),
        } satisfies PluginInfo;
      } catch {
        return null;
      }
    }));

  return updatePluginCache(
    plugins.filter((entry): entry is PluginInfo => entry != null),
  );
}

export async function getPluginsDirectory(): Promise<string> {
  return ensurePluginsDirectory();
}

export function getCachedPlugins(): PluginInfo[] {
  return [...pluginCache];
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
  const pluginsDir = await ensurePluginsDirectory();
  await deletePath(pluginsDir, pluginId);
  await Promise.allSettled([
    deleteStorageValue(PLUGIN_NAMESPACE, pluginId),
    clearStorageNamespace(`plugin-data:${pluginId}`),
  ]);
  pluginCache = pluginCache.filter((plugin) => plugin.manifest.id !== pluginId);
}

export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  await setStorageValue(PLUGIN_NAMESPACE, pluginId, { enabled });
  pluginCache = pluginCache.map((plugin) => (
    plugin.manifest.id === pluginId ? { ...plugin, enabled } : plugin
  ));
}
