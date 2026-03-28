import { invokeWails } from '@api/wails';
import type { LocalizationPayload } from './types';

const loadSettingsHandler = () => import('../../../wailsjs/go/wailshandler/SettingsHandler');

function normalizeLocalization(payload: {
  selectedLocale: string;
  effectiveLocale: string;
  availableLocales: Array<{ code: string; label: string; source: string }>;
  messages: Record<string, string>;
}): LocalizationPayload {
  return {
    selectedLocale: payload.selectedLocale,
    effectiveLocale: payload.effectiveLocale,
    availableLocales: payload.availableLocales.map((locale) => ({
      code: locale.code,
      label: locale.label,
      source: locale.source === 'builtin' ? 'builtin' : 'custom',
    })),
    messages: payload.messages,
  };
}

export async function getLocalization(preferredLocales: string[]): Promise<LocalizationPayload> {
  const payload = await invokeWails(loadSettingsHandler, (mod) => mod.GetLocalization(preferredLocales));
  return normalizeLocalization(payload);
}

export async function setLocale(locale: string, preferredLocales: string[]): Promise<LocalizationPayload> {
  const payload = await invokeWails(loadSettingsHandler, (mod) => mod.SetLocale(locale, preferredLocales));
  return normalizeLocalization(payload);
}
