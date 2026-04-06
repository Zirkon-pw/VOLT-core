import { create } from 'zustand';
import { getPluginData, setPluginData } from '@kernel/plugin-system/api/PluginRuntime';
import type { PluginSettingField, PluginSettingsSection } from '@kernel/plugin-system/api/pluginTypes';
import type { PluginSettingChangeEvent } from '@shared/lib/plugin-runtime';
import { reportPluginError, safeExecuteMaybeAsync } from '@shared/lib/plugin-runtime';

export const PLUGIN_SETTINGS_STORAGE_KEY = '__volt_plugin_settings__';

export interface PluginSettingsStoreState {
  valuesByPlugin: Record<string, Record<string, unknown>>;
  loadedPlugins: Record<string, boolean>;
  setPluginValues: (pluginId: string, values: Record<string, unknown>) => void;
  clearPluginValues: (pluginId: string) => void;
}

type PluginSettingsChangeListener = (event: PluginSettingChangeEvent) => void | Promise<void>;

const pluginSettingsListeners = new Map<string, Set<PluginSettingsChangeListener>>();
const loadingPromises = new Map<string, Promise<Record<string, unknown>>>();

export const usePluginSettingsStore = create<PluginSettingsStoreState>((set) => ({
  valuesByPlugin: {},
  loadedPlugins: {},
  setPluginValues: (pluginId, values) => set((state) => ({
    valuesByPlugin: {
      ...state.valuesByPlugin,
      [pluginId]: values,
    },
    loadedPlugins: {
      ...state.loadedPlugins,
      [pluginId]: true,
    },
  })),
  clearPluginValues: (pluginId) => set((state) => {
    const nextValues = { ...state.valuesByPlugin };
    delete nextValues[pluginId];

    const nextLoaded = { ...state.loadedPlugins };
    delete nextLoaded[pluginId];

    return {
      valuesByPlugin: nextValues,
      loadedPlugins: nextLoaded,
    };
  }),
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function flattenPluginSettingFields(sections: PluginSettingsSection[] = []): PluginSettingField[] {
  return sections.flatMap((section) => section.fields);
}

export function normalizePluginSettingFieldValue(field: PluginSettingField, value: unknown): unknown {
  switch (field.type) {
    case 'toggle':
      return typeof value === 'boolean' ? value : field.defaultValue;
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? value : field.defaultValue;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return field.defaultValue;
      }

      let normalized = value;
      if (field.min != null) {
        normalized = Math.max(field.min, normalized);
      }
      if (field.max != null) {
        normalized = Math.min(field.max, normalized);
      }
      return normalized;
    }
    case 'select':
      return field.options.some((option) => option.value === value)
        ? value
        : field.defaultValue;
    default:
      return value;
  }
}

function parseStoredSettings(pluginId: string, raw: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch (err) {
    reportPluginError(pluginId, 'settings.load', err);
    return {};
  }
}

export function getMergedPluginSettings(
  pluginId: string,
  sections: PluginSettingsSection[] = [],
  rawValues = usePluginSettingsStore.getState().valuesByPlugin[pluginId] ?? {},
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...rawValues };

  for (const field of flattenPluginSettingFields(sections)) {
    merged[field.key] = normalizePluginSettingFieldValue(field, rawValues[field.key]);
  }

  return merged;
}

export async function ensurePluginSettingsLoaded(pluginId: string): Promise<Record<string, unknown>> {
  const state = usePluginSettingsStore.getState();
  if (state.loadedPlugins[pluginId]) {
    return state.valuesByPlugin[pluginId] ?? {};
  }

  const existingPromise = loadingPromises.get(pluginId);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    const raw = await getPluginData(pluginId, PLUGIN_SETTINGS_STORAGE_KEY);
    const values = parseStoredSettings(pluginId, raw);
    usePluginSettingsStore.getState().setPluginValues(pluginId, values);
    return values;
  })().finally(() => {
    loadingPromises.delete(pluginId);
  });

  loadingPromises.set(pluginId, promise);
  return promise;
}

export async function getPluginSettingValue<T = unknown>(
  pluginId: string,
  key: string,
  sections: PluginSettingsSection[] = [],
): Promise<T | undefined> {
  await ensurePluginSettingsLoaded(pluginId);
  const merged = getMergedPluginSettings(pluginId, sections);
  return merged[key] as T | undefined;
}

export async function getAllPluginSettings(
  pluginId: string,
  sections: PluginSettingsSection[] = [],
): Promise<Record<string, unknown>> {
  await ensurePluginSettingsLoaded(pluginId);
  return getMergedPluginSettings(pluginId, sections);
}

function emitPluginSettingChange(pluginId: string, event: PluginSettingChangeEvent): void {
  const listeners = pluginSettingsListeners.get(pluginId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    safeExecuteMaybeAsync(pluginId, `settings:onChange:${event.key}`, () => listener(event));
  }
}

export async function setPluginSettingValue(
  pluginId: string,
  key: string,
  value: unknown,
  sections: PluginSettingsSection[] = [],
): Promise<Record<string, unknown>> {
  await ensurePluginSettingsLoaded(pluginId);

  const field = flattenPluginSettingFields(sections).find((candidate) => candidate.key === key);
  const normalizedValue = field
    ? normalizePluginSettingFieldValue(field, value)
    : value;

  const currentValues = usePluginSettingsStore.getState().valuesByPlugin[pluginId] ?? {};
  const nextValues = { ...currentValues };
  if (normalizedValue === undefined) {
    delete nextValues[key];
  } else {
    nextValues[key] = normalizedValue;
  }

  usePluginSettingsStore.getState().setPluginValues(pluginId, nextValues);
  await setPluginData(pluginId, PLUGIN_SETTINGS_STORAGE_KEY, JSON.stringify(nextValues));

  const merged = getMergedPluginSettings(pluginId, sections, nextValues);
  emitPluginSettingChange(pluginId, {
    key,
    value: merged[key],
    values: merged,
  });
  return merged;
}

export function subscribePluginSettings(
  pluginId: string,
  callback: PluginSettingsChangeListener,
): () => void {
  let listeners = pluginSettingsListeners.get(pluginId);
  if (!listeners) {
    listeners = new Set();
    pluginSettingsListeners.set(pluginId, listeners);
  }

  listeners.add(callback);

  return () => {
    const nextListeners = pluginSettingsListeners.get(pluginId);
    if (!nextListeners) {
      return;
    }

    nextListeners.delete(callback);
    if (nextListeners.size === 0) {
      pluginSettingsListeners.delete(pluginId);
    }
  };
}

export function clearPluginSettingsRuntime(pluginId: string): void {
  pluginSettingsListeners.delete(pluginId);
}

export function clearAllPluginSettingsRuntime(): void {
  pluginSettingsListeners.clear();
}
