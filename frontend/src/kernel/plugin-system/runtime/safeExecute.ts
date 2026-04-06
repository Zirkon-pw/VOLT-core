import { usePluginLogStore } from '@entities/plugin/model/pluginLogStore';
import { useToastStore } from '@shared/ui/toast';

export class PluginHandledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginHandledError';
  }
}

function getPluginErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function reportPluginError(pluginId: string, label: string, err: unknown): PluginHandledError {
  const message = getPluginErrorMessage(err);
  console.error(`[Plugin ${pluginId}] ${label}:`, err);
  usePluginLogStore.getState().addEntry(pluginId, 'error', `${label}: ${message}`);
  useToastStore.getState().addToast(`Plugin "${pluginId}" error: ${message}`, 'error', 5000);
  return new PluginHandledError(message);
}

export function safeExecute(pluginId: string, label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (err instanceof PluginHandledError) {
      return;
    }
    reportPluginError(pluginId, label, err);
  }
}

export async function safeExecuteAsync(pluginId: string, label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof PluginHandledError) {
      return;
    }
    reportPluginError(pluginId, label, err);
  }
}

export function safeExecuteMaybeAsync(
  pluginId: string,
  label: string,
  fn: () => void | Promise<void>,
): void {
  try {
    const result = fn();
    if (result && typeof (result as Promise<void>).then === 'function') {
      void safeExecuteAsync(pluginId, label, async () => {
        await result;
      });
    }
  } catch (err) {
    if (err instanceof PluginHandledError) {
      return;
    }
    reportPluginError(pluginId, label, err);
  }
}
