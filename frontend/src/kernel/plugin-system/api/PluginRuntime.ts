import { pickFiles } from '@shared/api/dialog';
import { cancelProcess, startProcess } from '@shared/api/process';
import { getStorageValue, setStorageValue } from '@shared/api/storage';
import { translate } from '@shared/i18n';

const PLUGIN_DATA_NAMESPACE = 'plugin-data';
const PLUGIN_SOURCE_NAMESPACE = 'plugin-source';

export async function loadPluginSource(pluginId: string): Promise<string> {
  const source = await getStorageValue<string>(PLUGIN_SOURCE_NAMESPACE, pluginId);
  if (!source) {
    throw new Error(`Plugin source for "${pluginId}" is not available.`);
  }
  return source;
}

export async function getPluginData(pluginId: string, key: string): Promise<string> {
  const value = await getStorageValue<unknown>(PLUGIN_DATA_NAMESPACE, `${pluginId}:${key}`);
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

  await setStorageValue(PLUGIN_DATA_NAMESPACE, `${pluginId}:${key}`, parsed);
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
