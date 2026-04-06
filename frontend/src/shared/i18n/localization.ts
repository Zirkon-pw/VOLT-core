import enLocale from './locales/en.json';
import ruLocale from './locales/ru.json';
import { getStorageValue, setStorageValue } from '@shared/api/storage';
import type { LocalizationPayload } from './types';

const SETTINGS_NAMESPACE = 'settings';
const APP_SETTINGS_KEY = 'app';
const AUTO_LOCALE = 'auto';

type LocaleCatalog = {
  label: string;
  messages: Record<string, string>;
};

const BUILTIN_LOCALES: Record<string, LocaleCatalog> = {
  en: enLocale,
  ru: ruLocale,
};

function resolveEffectiveLocale(selectedLocale: string, preferredLocales: string[]): string {
  if (selectedLocale !== AUTO_LOCALE && BUILTIN_LOCALES[selectedLocale]) {
    return selectedLocale;
  }

  for (const locale of preferredLocales) {
    const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
    if (BUILTIN_LOCALES[normalized]) {
      return normalized;
    }

    const base = normalized.split('-')[0];
    if (base && BUILTIN_LOCALES[base]) {
      return base;
    }
  }

  return 'en';
}

async function readSelectedLocale(): Promise<string> {
  const settings = await getStorageValue<{ locale?: string }>(SETTINGS_NAMESPACE, APP_SETTINGS_KEY);
  const storedLocale = settings?.locale?.trim().toLowerCase();
  return storedLocale || AUTO_LOCALE;
}

function buildLocalizationPayload(
  selectedLocale: string,
  preferredLocales: string[],
): LocalizationPayload {
  const effectiveLocale = resolveEffectiveLocale(selectedLocale, preferredLocales);
  const fallbackMessages = BUILTIN_LOCALES.en.messages;
  const localeMessages = BUILTIN_LOCALES[effectiveLocale]?.messages ?? {};

  return {
    selectedLocale,
    effectiveLocale,
    availableLocales: Object.entries(BUILTIN_LOCALES).map(([code, locale]) => ({
      code,
      label: locale.label,
      source: 'builtin',
    })),
    messages: {
      ...fallbackMessages,
      ...localeMessages,
    },
  };
}

export async function getLocalization(preferredLocales: string[]): Promise<LocalizationPayload> {
  return buildLocalizationPayload(await readSelectedLocale(), preferredLocales);
}

export function getFallbackLocalization(preferredLocales: string[]): LocalizationPayload {
  return buildLocalizationPayload(AUTO_LOCALE, preferredLocales);
}

export async function setLocale(locale: string, preferredLocales: string[]): Promise<LocalizationPayload> {
  const selectedLocale = locale.trim().toLowerCase() || AUTO_LOCALE;
  await setStorageValue(SETTINGS_NAMESPACE, APP_SETTINGS_KEY, {
    locale: selectedLocale,
  });
  return buildLocalizationPayload(selectedLocale, preferredLocales);
}
