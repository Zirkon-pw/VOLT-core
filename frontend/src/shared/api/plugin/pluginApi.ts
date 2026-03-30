import type { PluginInfo } from './types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';
import { asPluginInfo, asPluginInfoList } from '@shared/api/typeGuards';

const loadPluginHandler = () => import('../../../../wailsjs/go/wailshandler/PluginHandler');

export async function listPlugins(): Promise<PluginInfo[]> {
  const plugins = await invokeWailsSafe(loadPluginHandler, (mod) => mod.ListPlugins(), 'listPlugins');
  return asPluginInfoList(plugins);
}

export async function pickPluginArchive(): Promise<string> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.PickPluginArchive(), 'pickPluginArchive');
}

export async function importPluginArchive(archivePath: string): Promise<PluginInfo> {
  const plugin = await invokeWailsSafe(loadPluginHandler, (mod) => mod.ImportPluginArchive(archivePath), 'importPluginArchive');
  return asPluginInfo(plugin);
}

export async function deletePlugin(pluginId: string): Promise<void> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.DeletePlugin(pluginId), 'deletePlugin');
}

export async function loadPluginSource(pluginId: string): Promise<string> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.LoadPluginSource(pluginId), 'loadPluginSource');
}

export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.SetPluginEnabled(pluginId, enabled), 'setPluginEnabled');
}

export async function getPluginData(pluginId: string, key: string): Promise<string> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.GetPluginData(pluginId, key), 'getPluginData');
}

export async function setPluginData(pluginId: string, key: string, value: string): Promise<void> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.SetPluginData(pluginId, key, value), 'setPluginData');
}

export async function startPluginProcess(
  runId: string,
  voltPath: string,
  command: string,
  args: string[],
  stdin: string,
  stdoutMode: 'raw' | 'lines',
  stderrMode: 'raw' | 'lines',
): Promise<void> {
  return invokeWailsSafe(loadPluginHandler, (mod) =>
    mod.StartPluginProcess(runId, voltPath, command, args, stdin, stdoutMode, stderrMode),
  'startPluginProcess');
}

export async function cancelPluginProcess(runId: string): Promise<void> {
  return invokeWailsSafe(loadPluginHandler, (mod) => mod.CancelPluginProcess(runId), 'cancelPluginProcess');
}
