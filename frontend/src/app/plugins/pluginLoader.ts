import type { PluginInfo } from '@api/plugin';
import { listPlugins, loadPluginSource } from '@api/plugin';
import { createPluginAPI } from './pluginApiFactory';
import { clearAll, usePluginRegistryStore } from './pluginRegistry';
import { clearAllListeners, clearPluginListeners } from './pluginEventBus';
import { usePluginLogStore } from './pluginLogStore';
import { reportPluginError, safeExecute } from './safeExecute';
import { useTabStore } from '@app/stores/tabStore';

let activeLoadAllSession = 0;

function isStaleLoadAllSession(sessionId?: number): boolean {
  return sessionId != null && sessionId !== activeLoadAllSession;
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
    const api = createPluginAPI(pluginId, voltPath, pluginInfo.manifest.permissions ?? []);
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
  clearAll();
  clearAllListeners();

  try {
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
    const plugins = await listPlugins();
    const pluginInfo = plugins.find((p) => p.manifest.id === pluginId);
    if (!pluginInfo || !pluginInfo.enabled) return;
    await loadPlugin(pluginInfo, voltPath);
  } catch (err) {
    reportPluginError(pluginId, 'loadSingle', err);
  }
}

export function unloadSinglePlugin(pluginId: string): void {
  usePluginRegistryStore.getState().removeByPluginId(pluginId);
  clearPluginListeners(pluginId);
  useTabStore.getState().removePluginTabs(pluginId);
  window.dispatchEvent(new CustomEvent('volt:plugin-unloaded', { detail: { pluginId } }));
}

export function unloadAllPlugins(): void {
  activeLoadAllSession += 1;
  clearAll();
  clearAllListeners();
}
