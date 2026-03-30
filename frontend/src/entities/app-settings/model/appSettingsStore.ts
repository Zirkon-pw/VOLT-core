import { create } from 'zustand';
import { getLocalization, setLocale as persistLocale } from '@shared/api/settings';
import type { LocalizationPayload } from '@shared/api/settings';
import { normalizeShortcutBinding } from '@shared/lib/hotkeys';
import { setLocalizationRuntime } from '@shared/i18n';
import { getPluginCommandShortcutActionPrefix } from './shortcutCatalog';
import type { AppSettings, AppSettingsState, AppTheme, ShortcutOverrideMap } from './types';

const APP_SETTINGS_STORAGE_KEY = 'volt-app-settings';
const LEGACY_THEME_STORAGE_KEY = 'volt-theme';
const LEGACY_IMAGE_DIR_STORAGE_KEY = 'volt-image-dir';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getPreferredLocales(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  const locales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return Array.from(new Set(locales));
}

function inferTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeShortcutOverrides(value: unknown): ShortcutOverrideMap {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<ShortcutOverrideMap>((acc, [actionId, binding]) => {
    const normalizedBinding = normalizeShortcutBinding(typeof binding === 'string' ? binding : null);
    if (normalizedBinding) {
      acc[actionId] = normalizedBinding;
    }
    return acc;
  }, {});
}

function readStoredSettings(): AppSettings {
  if (typeof localStorage === 'undefined') {
    return {
      theme: 'light',
      locale: 'auto',
      imageDir: 'attachments',
      shortcutOverrides: {},
    };
  }

  let storedValue: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    storedValue = isRecord(parsed) ? parsed : {};
  } catch {
    storedValue = {};
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  const legacyImageDir = localStorage.getItem(LEGACY_IMAGE_DIR_STORAGE_KEY);
  const theme = storedValue.theme === 'dark' || storedValue.theme === 'light'
    ? storedValue.theme
    : (legacyTheme === 'dark' || legacyTheme === 'light' ? legacyTheme : inferTheme());
  const locale = typeof storedValue.locale === 'string' && storedValue.locale.trim().length > 0
    ? storedValue.locale
    : 'auto';
  const imageDir = typeof storedValue.imageDir === 'string' && storedValue.imageDir.trim().length > 0
    ? storedValue.imageDir.trim()
    : (legacyImageDir?.trim() || 'attachments');

  return {
    theme,
    locale,
    imageDir,
    shortcutOverrides: normalizeShortcutOverrides(storedValue.shortcutOverrides),
  };
}

function persistSettings(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function createSettingsUpdater(set: (updater: (state: AppSettingsState) => Partial<AppSettingsState>) => void) {
  return (updater: (settings: AppSettings) => AppSettings) => {
    set((state) => {
      const nextSettings = updater(state.settings);
      persistSettings(nextSettings);
      return { settings: nextSettings };
    });
  };
}

const initialSettings = readStoredSettings();

export const useAppSettingsStore = create<AppSettingsState>((set, get) => {
  const updateSettings = createSettingsUpdater(set);

  return {
    settings: initialSettings,
    localization: null,
    setTheme: (theme) => {
      updateSettings((settings) => ({ ...settings, theme }));
    },
    setImageDir: (imageDir) => {
      updateSettings((settings) => ({
        ...settings,
        imageDir: imageDir.trim() || 'attachments',
      }));
    },
    setShortcutOverride: (actionId, binding) => {
      updateSettings((settings) => {
        const nextOverrides = { ...settings.shortcutOverrides };
        const normalizedBinding = normalizeShortcutBinding(binding);
        if (normalizedBinding) {
          nextOverrides[actionId] = normalizedBinding;
        } else {
          delete nextOverrides[actionId];
        }

        return {
          ...settings,
          shortcutOverrides: nextOverrides,
        };
      });
    },
    resetShortcutOverride: (actionId) => {
      updateSettings((settings) => {
        if (!(actionId in settings.shortcutOverrides)) {
          return settings;
        }

        const nextOverrides = { ...settings.shortcutOverrides };
        delete nextOverrides[actionId];
        return {
          ...settings,
          shortcutOverrides: nextOverrides,
        };
      });
    },
    clearPluginShortcutOverrides: (pluginId) => {
      updateSettings((settings) => {
        const prefix = getPluginCommandShortcutActionPrefix(pluginId);
        const nextOverrides = Object.entries(settings.shortcutOverrides).reduce<ShortcutOverrideMap>((acc, [actionId, binding]) => {
          if (!actionId.startsWith(prefix)) {
            acc[actionId] = binding;
          }
          return acc;
        }, {});

        if (Object.keys(nextOverrides).length === Object.keys(settings.shortcutOverrides).length) {
          return settings;
        }

        return {
          ...settings,
          shortcutOverrides: nextOverrides,
        };
      });
    },
    applyLocalization: (payload) => {
      setLocalizationRuntime(payload);
      set((state) => {
        const nextSettings = {
          ...state.settings,
          locale: payload.selectedLocale,
        };
        persistSettings(nextSettings);
        return {
          settings: nextSettings,
          localization: payload,
        };
      });
    },
    async refreshLocalization(): Promise<LocalizationPayload> {
      const payload = await getLocalization(getPreferredLocales());
      get().applyLocalization(payload);
      return payload;
    },
    async setLocale(locale: string): Promise<LocalizationPayload> {
      const payload = await persistLocale(locale, getPreferredLocales());
      get().applyLocalization(payload);
      return payload;
    },
  };
});
