import { pickFiles } from '@shared/api/dialog';
import { readFile } from '@shared/api/file';
import { cancelProcess, startProcess } from '@shared/api/process';
import { getStorageValue, setStorageValue } from '@shared/api/storage';
import { translate } from '@shared/i18n';
import { getPluginsDirectory } from './catalogApi';

function getPluginDataNamespace(pluginId: string): string {
  return `plugin-data:${pluginId}`;
}

export async function loadPluginSource(pluginId: string): Promise<string> {
  const pluginsDir = await getPluginsDirectory();
  return readFile(pluginsDir, `${pluginId}/main.js`);
}

export async function getPluginData(pluginId: string, key: string): Promise<string> {
  const value = await getStorageValue<unknown>(getPluginDataNamespace(pluginId), key);
  if (value == null) {
    return '';
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function setPluginData(pluginId: string, key: string, value: string): Promise<void> {
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }

  await setStorageValue(getPluginDataNamespace(pluginId), key, parsed);
}

export async function pickPluginFiles(
  title: string,
  accept: string[],
  multiple: boolean,
): Promise<string[]> {
  return pickFiles(
    title,
    accept.map((pattern) => ({
      displayName: pattern,
      pattern,
    })),
    multiple,
  );
}

export async function copyPluginAsset(
  voltPath: string,
  sourcePath: string,
  targetDir: string,
): Promise<string> {
  throw new Error(`Copying plugin asset "${sourcePath}" into "${voltPath}/${targetDir}" is not available yet.`);
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
  return startProcess({
    runId,
    voltPath,
    command,
    args,
    stdin,
    stdoutMode,
    stderrMode,
    startFailedMessage: translate('backend.error.process.startFailed'),
    streamFailedMessage: translate('backend.error.process.streamFailed'),
    runFailedMessage: translate('backend.error.process.runFailed'),
  });
}

export async function cancelPluginProcess(runId: string): Promise<void> {
  return cancelProcess(runId);
}
