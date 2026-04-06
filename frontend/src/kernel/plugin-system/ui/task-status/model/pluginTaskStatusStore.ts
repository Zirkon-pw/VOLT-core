import { create } from 'zustand';
import { PLUGIN_STATUS } from '@shared/config/constants';
import { getEditorSessionSourceInfo } from '@kernel/plugin-system/runtime';

export type PluginTaskStatusState = 'running' | 'success' | 'error' | 'cancelled';
export type PluginTaskStatusSurface = 'floating' | 'workspace-banner';
export type PluginTaskStatusScope = 'workspace' | 'source-note';

export interface PluginTaskStatusConfig {
  title: string;
  message?: string;
  cancellable?: boolean;
  onCancel?: () => void | Promise<void>;
  surface?: PluginTaskStatusSurface;
  sessionId?: string;
  scope?: PluginTaskStatusScope;
}

export interface PluginTaskStatusItem {
  id: string;
  pluginId: string;
  title: string;
  message: string;
  state: PluginTaskStatusState;
  cancellable: boolean;
  onCancel?: () => void | Promise<void>;
  surface: PluginTaskStatusSurface;
  sessionId?: string;
  scope: PluginTaskStatusScope;
  sourceVoltPath?: string;
  sourceFilePath?: string;
}

export interface PluginTaskStatusHandle {
  setMessage(message: string): void;
  markSuccess(message?: string): void;
  markError(message: string): void;
  markCancelled(message?: string): void;
  close(): void;
}

interface PluginTaskStatusStoreState {
  items: PluginTaskStatusItem[];
  upsertStatus: (item: PluginTaskStatusItem) => void;
  removeStatus: (id: string) => void;
  clearByPlugin: (pluginId: string) => void;
  clearAll: () => void;
}

const closeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const usePluginTaskStatusStore = create<PluginTaskStatusStoreState>((set) => ({
  items: [],
  upsertStatus: (item) => set((state) => {
    const existingIndex = state.items.findIndex((entry) => entry.id === item.id);
    if (existingIndex === -1) {
      return { items: [...state.items, item] };
    }

    const nextItems = [...state.items];
    nextItems[existingIndex] = item;
    return { items: nextItems };
  }),
  removeStatus: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
  clearByPlugin: (pluginId) => set((state) => ({
    items: state.items.filter((item) => item.pluginId !== pluginId),
  })),
  clearAll: () => set({ items: [] }),
}));

function clearCloseTimer(statusId: string): void {
  const timer = closeTimers.get(statusId);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  closeTimers.delete(statusId);
}

function scheduleAutoClose(statusId: string, delayMs: number): void {
  clearCloseTimer(statusId);
  const timer = setTimeout(() => {
    closeTimers.delete(statusId);
    usePluginTaskStatusStore.getState().removeStatus(statusId);
  }, delayMs);
  closeTimers.set(statusId, timer);
}

function updateStatus(
  statusId: string,
  patch: Partial<PluginTaskStatusItem>,
): void {
  const current = usePluginTaskStatusStore.getState().items.find((item) => item.id === statusId);
  if (!current) {
    return;
  }

  usePluginTaskStatusStore.getState().upsertStatus({
    ...current,
    ...patch,
  });
}

export function createPluginTaskStatus(
  pluginId: string,
  config: PluginTaskStatusConfig,
): PluginTaskStatusHandle {
  const statusId = globalThis.crypto?.randomUUID?.() ?? `plugin-task-${Date.now()}`;
  const sessionInfo = config.sessionId ? getEditorSessionSourceInfo(config.sessionId) : null;

  usePluginTaskStatusStore.getState().upsertStatus({
    id: statusId,
    pluginId,
    title: config.title,
    message: config.message ?? '',
    state: 'running',
    cancellable: config.cancellable === true,
    onCancel: config.onCancel,
    surface: config.surface ?? 'floating',
    sessionId: config.sessionId,
    scope: config.scope ?? 'workspace',
    sourceVoltPath: sessionInfo?.voltPath,
    sourceFilePath: sessionInfo?.filePath,
  });

  const close = () => {
    clearCloseTimer(statusId);
    usePluginTaskStatusStore.getState().removeStatus(statusId);
  };

  return {
    setMessage(message: string) {
      clearCloseTimer(statusId);
      updateStatus(statusId, { message });
    },
    markSuccess(message?: string) {
      updateStatus(statusId, {
        state: 'success',
        cancellable: false,
        message: message ?? usePluginTaskStatusStore.getState().items.find((item) => item.id === statusId)?.message ?? '',
      });
      scheduleAutoClose(statusId, PLUGIN_STATUS.AUTO_CLOSE_SUCCESS_MS);
    },
    markError(message: string) {
      updateStatus(statusId, {
        state: 'error',
        cancellable: false,
        message,
      });
      scheduleAutoClose(statusId, PLUGIN_STATUS.AUTO_CLOSE_ERROR_MS);
    },
    markCancelled(message?: string) {
      updateStatus(statusId, {
        state: 'cancelled',
        cancellable: false,
        message: message ?? usePluginTaskStatusStore.getState().items.find((item) => item.id === statusId)?.message ?? '',
      });
      scheduleAutoClose(statusId, PLUGIN_STATUS.AUTO_CLOSE_CANCELLED_MS);
    },
    close,
  };
}

export function cleanupPluginTaskStatuses(pluginId: string): void {
  for (const item of usePluginTaskStatusStore.getState().items) {
    if (item.pluginId === pluginId) {
      clearCloseTimer(item.id);
    }
  }
  usePluginTaskStatusStore.getState().clearByPlugin(pluginId);
}

export function cleanupAllPluginTaskStatuses(): void {
  for (const statusId of closeTimers.keys()) {
    clearCloseTimer(statusId);
  }
  usePluginTaskStatusStore.getState().clearAll();
}
