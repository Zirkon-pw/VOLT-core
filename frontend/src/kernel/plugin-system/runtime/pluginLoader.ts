import type { PluginInfo } from '@kernel/plugin-system/api/pluginTypes';
import { listPlugins } from '@kernel/plugin-system/api/PluginCatalog';
import { loadPluginSource } from '@kernel/plugin-system/api/PluginRuntime';
import { builtinPlugins, getBuiltinPlugin, isBuiltinPlugin } from '@plugins/registry';
import { createPluginAPI } from './pluginApiFactory';
import type { VoltPluginAPI } from './pluginApi';
import { clearAllListeners, clearPluginListeners } from './pluginEventBus';
import { reportPluginError, safeExecute, safeExecuteAsync, safeExecuteMaybeAsync } from './safeExecute';
import { cleanupPluginProcesses, cleanupAllPluginProcesses } from './pluginProcessManager';
import { cleanupPluginEditorSessions, cleanupAllEditorSessions } from './editorSessionManager';
import { cleanupAllHostEditors, cleanupPluginHostEditors } from './hostEditorService';
import { useTabStore } from '@entities/tab';
import {
  clearAll,
  clearAllPluginSettingsRuntime,
  clearPluginSettingsRuntime,
  usePluginLogStore,
  usePluginRegistryStore,
} from '@entities/plugin';
import {
  cleanupAllPluginTaskStatuses,
  cleanupPluginTaskStatuses,
} from '@features/plugin-task-status';

let activeLoadAllSession = 0;
const builtinPluginApis = new Map<string, VoltPluginAPI>();

function isStaleLoadAllSession(sessionId?: number): boolean {
  return sessionId != null && sessionId !== activeLoadAllSession;
}

function cleanupPluginRuntime(pluginId: string): void {
  cleanupPluginProcesses(pluginId);
  cleanupPluginEditorSessions(pluginId);
  cleanupPluginHostEditors(pluginId);
  cleanupPluginTaskStatuses(pluginId);
  clearPluginSettingsRuntime(pluginId);
  usePluginRegistryStore.getState().removeByPluginId(pluginId);
  clearPluginListeners(pluginId);
  useTabStore.getState().removePluginTabs(pluginId);
  window.dispatchEvent(new CustomEvent('volt:plugin-unloaded', { detail: { pluginId } }));
}

async function loadBuiltinPlugin(pluginId: string, voltPath: string, sessionId?: number): Promise<void> {
  const plugin = getBuiltinPlugin(pluginId);
  if (!plugin) {
    return;
  }

  const api = createPluginAPI(
    plugin.manifest.id,
    voltPath,
    plugin.manifest.permissions ?? [],
    plugin.manifest.settings?.sections ?? [],
  );
  builtinPluginApis.set(plugin.manifest.id, api);

  if (isStaleLoadAllSession(sessionId)) {
    builtinPluginApis.delete(plugin.manifest.id);
    return;
  }

  if (!plugin.onLoad) {
    return;
  }

  await safeExecuteAsync(plugin.manifest.id, 'onLoad', async () => {
    await plugin.onLoad!(api);
  });
}

function unloadBuiltinPlugin(pluginId: string): void {
  const plugin = getBuiltinPlugin(pluginId);
  const api = builtinPluginApis.get(pluginId);

  if (plugin?.onUnload && api) {
    safeExecuteMaybeAsync(pluginId, 'onUnload', () => plugin.onUnload!(api));
  }

  builtinPluginApis.delete(pluginId);
}

export async function loadPlugin(
  pluginInfo: PluginInfo,
  voltPath: string,
  sessionId?: number,
): Promise<void> {
  const pluginId = pluginInfo.manifest.id;
  try {
    const source = await loadPluginSource(pluginId);
    if (isStaleLoadAllSession(sessionId)) {
      return;
    }

    const pluginFn = new Function('api', source);
    const api = createPluginAPI(
      pluginId,
      voltPath,
      pluginInfo.manifest.permissions ?? [],
      pluginInfo.manifest.settings?.sections ?? [],
    );
    if (isStaleLoadAllSession(sessionId)) {
      return;
    }

    safeExecute(pluginId, 'init', () => pluginFn(api));
  } catch (err) {
    reportPluginError(pluginId, 'load', err);
  }
}

export async function loadAllPlugins(voltPath: string): Promise<void> {
  const sessionId = ++activeLoadAllSession;
  cleanupAllPluginProcesses();
  cleanupAllEditorSessions();
  cleanupAllHostEditors();
  cleanupAllPluginTaskStatuses();
  clearAllPluginSettingsRuntime();
  clearAll();
  clearAllListeners();
  builtinPluginApis.clear();

  try {
    for (const plugin of builtinPlugins) {
      if (isStaleLoadAllSession(sessionId)) {
        return;
      }

      await loadBuiltinPlugin(plugin.manifest.id, voltPath, sessionId);
    }

    const plugins = await listPlugins();
    if (isStaleLoadAllSession(sessionId)) {
      return;
    }

    const enabled = plugins.filter((p) => p.enabled);

    for (const p of enabled) {
      if (isStaleLoadAllSession(sessionId)) {
        return;
      }

      await loadPlugin(p, voltPath, sessionId);
    }
  } catch (err) {
    usePluginLogStore.getState().addEntry('system', 'error', `loadAll: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function loadSinglePlugin(pluginId: string, voltPath: string): Promise<void> {
  try {
    unloadSinglePlugin(pluginId);
    if (isBuiltinPlugin(pluginId)) {
      await loadBuiltinPlugin(pluginId, voltPath);
      return;
    }

    const plugins = await listPlugins();
    const pluginInfo = plugins.find((p) => p.manifest.id === pluginId);
    if (!pluginInfo || !pluginInfo.enabled) return;
    await loadPlugin(pluginInfo, voltPath);
  } catch (err) {
    reportPluginError(pluginId, 'loadSingle', err);
  }
}

export function unloadSinglePlugin(pluginId: string): void {
  if (isBuiltinPlugin(pluginId)) {
    unloadBuiltinPlugin(pluginId);
  }

  cleanupPluginRuntime(pluginId);
}

export function unloadAllPlugins(): void {
  activeLoadAllSession += 1;
  Array.from(builtinPluginApis.keys()).forEach((pluginId) => {
    unloadBuiltinPlugin(pluginId);
  });
  cleanupAllPluginProcesses();
  cleanupAllEditorSessions();
  cleanupAllHostEditors();
  cleanupAllPluginTaskStatuses();
  clearAllPluginSettingsRuntime();
  clearAll();
  clearAllListeners();
  builtinPluginApis.clear();
}
