import type { PluginInfo } from '@shared/api/plugin';
import { listPlugins, loadPluginSource } from '@shared/api/plugin';
import { createPluginAPI } from './pluginApiFactory';
import { clearAllListeners, clearPluginListeners } from './pluginEventBus';
import { reportPluginError, safeExecute } from './safeExecute';
import { cleanupPluginProcesses, cleanupAllPluginProcesses } from './pluginProcessManager';
import { cleanupPluginEditorSessions, cleanupAllEditorSessions } from './editorSessionManager';
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
  cleanupAllPluginTaskStatuses();
  clearAllPluginSettingsRuntime();
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
  cleanupPluginProcesses(pluginId);
  cleanupPluginEditorSessions(pluginId);
  cleanupPluginTaskStatuses(pluginId);
  clearPluginSettingsRuntime(pluginId);
  usePluginRegistryStore.getState().removeByPluginId(pluginId);
  clearPluginListeners(pluginId);
  useTabStore.getState().removePluginTabs(pluginId);
  window.dispatchEvent(new CustomEvent('volt:plugin-unloaded', { detail: { pluginId } }));
}

export function unloadAllPlugins(): void {
  activeLoadAllSession += 1;
  cleanupAllPluginProcesses();
  cleanupAllEditorSessions();
  cleanupAllPluginTaskStatuses();
  clearAllPluginSettingsRuntime();
  clearAll();
  clearAllListeners();
}
