import type { PluginInfo } from '@kernel/plugin-system/api/pluginTypes';
import { listPlugins } from '@kernel/plugin-system/api/catalogApi';
import { loadPluginSource } from '@kernel/plugin-system/api/runtimeApi';
import { builtinPlugins, getBuiltinPlugin, isBuiltinPlugin } from '@plugins/registry';
import { createPluginAPI } from './pluginApiFactory';
import type { PluginSettingChangeEvent, PluginWorkspaceInfo, VoltPluginAPI } from './pluginApi';
import { clearAllListeners, clearPluginListeners } from './pluginEventBus';
import { reportPluginError, safeExecuteAsync, safeExecuteMaybeAsync } from './safeExecute';
import { cleanupPluginProcesses, cleanupAllPluginProcesses } from './pluginProcessManager';
import { cleanupPluginEditorSessions, cleanupAllEditorSessions } from './editorSessionManager';
import { cleanupAllHostEditors, cleanupPluginHostEditors } from './hostEditorService';
import { useTabStore } from '@kernel/workspace/tabs/model';
import {
  clearAll,
  clearAllPluginSettingsRuntime,
  clearPluginSettingsRuntime,
  subscribePluginSettings,
  usePluginLogStore,
  usePluginRegistryStore,
} from '@kernel/plugin-system/model';
import {
  cleanupAllPluginTaskStatuses,
  cleanupPluginTaskStatuses,
} from '@kernel/plugin-system/ui/task-status';
import { useWorkspaceStore } from '@kernel/workspace/core/model';
import type { BuiltinPluginModule } from '@plugins/types';

type PluginCleanup = (() => void | Promise<void>) | void;

interface PluginLifecycleModule {
  onLoad?: (api: VoltPluginAPI) => PluginCleanup | Promise<PluginCleanup>;
  onUnload?: (api: VoltPluginAPI) => void | Promise<void>;
  onSettingsChange?: (api: VoltPluginAPI, event: PluginSettingChangeEvent) => void | Promise<void>;
  onWorkspaceOpen?: (api: VoltPluginAPI, workspace: PluginWorkspaceInfo) => void | Promise<void>;
  legacy?: boolean;
}

interface LoadedPluginRuntime {
  api: VoltPluginAPI;
  cleanup?: (() => void | Promise<void>) | undefined;
  onUnload?: ((api: VoltPluginAPI) => void | Promise<void>) | undefined;
  onWorkspaceOpen?: ((api: VoltPluginAPI, workspace: PluginWorkspaceInfo) => void | Promise<void>) | undefined;
  settingsUnsubscribe?: (() => void) | undefined;
}

let activeLoadAllSession = 0;
const builtinPluginRuntimes = new Map<string, LoadedPluginRuntime>();
const externalPluginRuntimes = new Map<string, LoadedPluginRuntime>();

function isStaleLoadAllSession(sessionId?: number): boolean {
  return sessionId != null && sessionId !== activeLoadAllSession;
}

function createWorkspaceInfo(voltPath: string): PluginWorkspaceInfo {
  const workspaceStore = useWorkspaceStore.getState();
  const activeWorkspaceId = workspaceStore.activeWorkspaceId ?? '';
  const activeWorkspace = workspaceStore.workspaces.find((workspace) => workspace.voltId === activeWorkspaceId);

  return {
    voltId: activeWorkspace?.voltId ?? activeWorkspaceId,
    voltPath,
    rootPath: voltPath,
  };
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

async function importPluginModule(source: string, pluginId: string): Promise<Record<string, unknown>> {
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));

  try {
    const module = await import(/* @vite-ignore */ moduleUrl);
    return module as Record<string, unknown>;
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

function extractPluginHooks(candidate: unknown): PluginLifecycleModule {
  if (typeof candidate === 'function') {
    return {
      onLoad: (api: VoltPluginAPI) => (candidate as (api: VoltPluginAPI) => PluginCleanup | Promise<PluginCleanup>)(api),
    };
  }

  if (candidate == null || typeof candidate !== 'object') {
    return {};
  }

  const record = candidate as Record<string, unknown>;
  const defaultExport = record.default;

  return {
    onLoad: typeof record.onLoad === 'function'
      ? record.onLoad as PluginLifecycleModule['onLoad']
      : (typeof defaultExport === 'function'
        ? ((api: VoltPluginAPI) => (defaultExport as (api: VoltPluginAPI) => PluginCleanup | Promise<PluginCleanup>)(api))
        : undefined),
    onUnload: typeof record.onUnload === 'function'
      ? record.onUnload as PluginLifecycleModule['onUnload']
      : undefined,
    onSettingsChange: typeof record.onSettingsChange === 'function'
      ? record.onSettingsChange as PluginLifecycleModule['onSettingsChange']
      : undefined,
    onWorkspaceOpen: typeof record.onWorkspaceOpen === 'function'
      ? record.onWorkspaceOpen as PluginLifecycleModule['onWorkspaceOpen']
      : undefined,
  };
}

function hasLifecycleHooks(module: PluginLifecycleModule): boolean {
  return Boolean(
    module.onLoad
    || module.onUnload
    || module.onSettingsChange
    || module.onWorkspaceOpen,
  );
}

function runLegacyPluginSource(source: string, api: VoltPluginAPI): PluginLifecycleModule {
  const module = { exports: {} as Record<string, unknown> };
  const legacyFactory = new Function(
    'api',
    'module',
    'exports',
    `${source}\nreturn module.exports;`,
  );

  const exported = legacyFactory(api, module, module.exports) as unknown;
  const lifecycle = extractPluginHooks(exported ?? module.exports);

  if (hasLifecycleHooks(lifecycle)) {
    return { ...lifecycle, legacy: true };
  }

  return { legacy: true };
}

async function loadExternalPluginModule(
  source: string,
  pluginId: string,
  api: VoltPluginAPI,
): Promise<PluginLifecycleModule> {
  try {
    return extractPluginHooks(await importPluginModule(source, pluginId));
  } catch (error) {
    usePluginLogStore.getState().addEntry(
      pluginId,
      'warn',
      'Plugin loaded through legacy compatibility mode. Please migrate it to the v5 lifecycle hooks.',
    );
    return runLegacyPluginSource(source, api);
  }
}

async function registerLoadedRuntime(
  pluginId: string,
  runtimeMap: Map<string, LoadedPluginRuntime>,
  api: VoltPluginAPI,
  lifecycle: PluginLifecycleModule,
  voltPath: string,
): Promise<void> {
  const runtime: LoadedPluginRuntime = {
    api,
    onUnload: lifecycle.onUnload,
    onWorkspaceOpen: lifecycle.onWorkspaceOpen,
  };

  if (lifecycle.onSettingsChange) {
    runtime.settingsUnsubscribe = subscribePluginSettings(pluginId, (event) => {
      safeExecuteMaybeAsync(pluginId, 'onSettingsChange', () => lifecycle.onSettingsChange!(api, event));
    });
  }

  runtimeMap.set(pluginId, runtime);

  if (lifecycle.onLoad) {
    try {
      const cleanup = await lifecycle.onLoad(api);
      if (typeof cleanup === 'function') {
        runtime.cleanup = cleanup;
      }
    } catch (error) {
      reportPluginError(pluginId, 'onLoad', error);
    }
  }

  if (lifecycle.onWorkspaceOpen) {
    await safeExecuteAsync(pluginId, 'onWorkspaceOpen', async () => lifecycle.onWorkspaceOpen!(api, createWorkspaceInfo(voltPath)));
  }
}

function disposeLoadedRuntime(pluginId: string, runtimeMap: Map<string, LoadedPluginRuntime>): void {
  const runtime = runtimeMap.get(pluginId);
  if (!runtime) {
    return;
  }

  runtime.settingsUnsubscribe?.();

  if (runtime.cleanup) {
    safeExecuteMaybeAsync(pluginId, 'cleanup', () => runtime.cleanup!());
  }

  if (runtime.onUnload) {
    safeExecuteMaybeAsync(pluginId, 'onUnload', () => runtime.onUnload!(runtime.api));
  }

  runtimeMap.delete(pluginId);
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

  if (isStaleLoadAllSession(sessionId)) {
    return;
  }

  await registerLoadedRuntime(plugin.manifest.id, builtinPluginRuntimes, api, plugin, voltPath);

  if (isStaleLoadAllSession(sessionId)) {
    disposeLoadedRuntime(plugin.manifest.id, builtinPluginRuntimes);
  }
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

    const api = createPluginAPI(
      pluginId,
      voltPath,
      pluginInfo.manifest.permissions ?? [],
      pluginInfo.manifest.settings?.sections ?? [],
    );
    const lifecycle = await loadExternalPluginModule(source, pluginId, api);
    if (isStaleLoadAllSession(sessionId)) {
      return;
    }

    await registerLoadedRuntime(pluginId, externalPluginRuntimes, api, lifecycle, voltPath);

    if (lifecycle.legacy) {
      usePluginLogStore.getState().addEntry(
        pluginId,
        'warn',
        'Legacy plugin compatibility mode is deprecated and will be removed after the v5 migration window.',
      );
    }
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
  builtinPluginRuntimes.clear();
  externalPluginRuntimes.clear();

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

    const enabled = plugins.filter((plugin) => plugin.enabled);

    for (const plugin of enabled) {
      if (isStaleLoadAllSession(sessionId)) {
        return;
      }

      await loadPlugin(plugin, voltPath, sessionId);
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
    const pluginInfo = plugins.find((plugin) => plugin.manifest.id === pluginId);
    if (!pluginInfo || !pluginInfo.enabled) {
      return;
    }

    await loadPlugin(pluginInfo, voltPath);
  } catch (err) {
    reportPluginError(pluginId, 'loadSingle', err);
  }
}

function unloadBuiltinPlugin(pluginId: string): void {
  disposeLoadedRuntime(pluginId, builtinPluginRuntimes);
}

function unloadExternalPlugin(pluginId: string): void {
  disposeLoadedRuntime(pluginId, externalPluginRuntimes);
}

export function unloadSinglePlugin(pluginId: string): void {
  if (isBuiltinPlugin(pluginId)) {
    unloadBuiltinPlugin(pluginId);
  } else {
    unloadExternalPlugin(pluginId);
  }

  cleanupPluginRuntime(pluginId);
}

export function unloadAllPlugins(): void {
  activeLoadAllSession += 1;
  Array.from(builtinPluginRuntimes.keys()).forEach((pluginId) => {
    unloadBuiltinPlugin(pluginId);
  });
  Array.from(externalPluginRuntimes.keys()).forEach((pluginId) => {
    unloadExternalPlugin(pluginId);
  });
  cleanupAllPluginProcesses();
  cleanupAllEditorSessions();
  cleanupAllHostEditors();
  cleanupAllPluginTaskStatuses();
  clearAllPluginSettingsRuntime();
  clearAll();
  clearAllListeners();
  builtinPluginRuntimes.clear();
  externalPluginRuntimes.clear();
}
