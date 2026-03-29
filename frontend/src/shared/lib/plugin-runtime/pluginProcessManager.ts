import { cancelPluginProcess, startPluginProcess as startPluginProcessApi } from '@shared/api/plugin';
import { waitForWailsBridge } from '@shared/api/wails';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';

export type PluginProcessMode = 'raw' | 'lines';

export interface PluginProcessStartConfig {
  command: string;
  args?: string[];
  stdin?: string;
  cwd: 'workspace';
  stdoutMode?: PluginProcessMode;
  stderrMode?: PluginProcessMode;
}

export type PluginProcessEvent =
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string };

export interface PluginProcessHandle {
  id: string;
  onEvent(callback: (event: PluginProcessEvent) => void): () => void;
  cancel(): Promise<void>;
}

interface ProcessRuntimeEvent {
  runId: string;
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data?: string;
  code?: number;
  message?: string;
}

interface InternalProcessRun {
  runId: string;
  pluginId: string;
  listeners: Set<(event: PluginProcessEvent) => void>;
}

const processRuns = new Map<string, InternalProcessRun>();
let eventUnsubscribe: (() => void) | null = null;
let eventBridgePromise: Promise<void> | null = null;

function emitProcessEvent(payload: ProcessRuntimeEvent): void {
  const run = processRuns.get(payload.runId);
  if (!run) {
    return;
  }

  let event: PluginProcessEvent | null = null;
  if (payload.type === 'stdout') {
    event = { type: 'stdout', data: payload.data ?? '' };
  } else if (payload.type === 'stderr') {
    event = { type: 'stderr', data: payload.data ?? '' };
  } else if (payload.type === 'exit') {
    event = { type: 'exit', code: payload.code ?? 0 };
  } else if (payload.type === 'error') {
    event = { type: 'error', message: payload.message ?? 'Process failed' };
  }

  if (!event) {
    return;
  }

  for (const listener of run.listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error(`[pluginProcess] Listener failed for run "${run.runId}":`, err);
    }
  }

  if (payload.type === 'exit' || payload.type === 'error') {
    processRuns.delete(payload.runId);
  }
}

async function ensureProcessEventBridge(): Promise<void> {
  if (eventUnsubscribe) {
    return;
  }

  if (!eventBridgePromise) {
    eventBridgePromise = (async () => {
      await waitForWailsBridge();
      eventUnsubscribe = EventsOn('volt:plugin-process', (payload: ProcessRuntimeEvent) => {
        emitProcessEvent(payload);
      });
    })();
  }

  await eventBridgePromise;
}

export async function startPluginProcess(
  pluginId: string,
  voltPath: string,
  config: PluginProcessStartConfig,
): Promise<PluginProcessHandle> {
  await ensureProcessEventBridge();

  const runId = globalThis.crypto?.randomUUID?.() ?? `process-${Date.now()}`;
  const run: InternalProcessRun = {
    runId,
    pluginId,
    listeners: new Set(),
  };
  processRuns.set(runId, run);

  try {
    await startPluginProcessApi(
      runId,
      voltPath,
      config.command,
      config.args ?? [],
      config.stdin ?? '',
      config.stdoutMode ?? 'raw',
      config.stderrMode ?? 'raw',
    );
  } catch (err) {
    processRuns.delete(runId);
    throw err;
  }

  return {
    id: runId,
    onEvent(callback) {
      run.listeners.add(callback);
      return () => {
        run.listeners.delete(callback);
      };
    },
    async cancel() {
      try {
        await cancelPluginProcess(runId);
      } finally {
        processRuns.delete(runId);
      }
    },
  };
}

export function cleanupPluginProcesses(pluginId: string): void {
  const runIds = Array.from(processRuns.values())
    .filter((run) => run.pluginId === pluginId)
    .map((run) => run.runId);

  for (const runId of runIds) {
    processRuns.delete(runId);
    void cancelPluginProcess(runId).catch(() => undefined);
  }
}

export function cleanupAllPluginProcesses(): void {
  const runIds = Array.from(processRuns.keys());
  processRuns.clear();
  for (const runId of runIds) {
    void cancelPluginProcess(runId).catch(() => undefined);
  }
}
