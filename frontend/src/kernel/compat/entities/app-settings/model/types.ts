import type { LocalizationPayload } from '@shared/i18n';

export type AppTheme = 'light' | 'dark';
export type ShortcutActionId = string;
export type ShortcutOverrideMap = Record<ShortcutActionId, string>;

export interface AppSettings {
  theme: AppTheme;
  locale: string;
  imageDir: string;
  shortcutOverrides: ShortcutOverrideMap;
}

export interface AppSettingsState {
  settings: AppSettings;
  localization: LocalizationPayload | null;
  setTheme: (theme: AppTheme) => void;
  setImageDir: (imageDir: string) => void;
  setShortcutOverride: (actionId: ShortcutActionId, binding: string | null) => void;
  resetShortcutOverride: (actionId: ShortcutActionId) => void;
  clearPluginShortcutOverrides: (pluginId: string) => void;
  applyLocalization: (payload: LocalizationPayload) => void;
  refreshLocalization: () => Promise<LocalizationPayload>;
  setLocale: (locale: string) => Promise<LocalizationPayload>;
}
