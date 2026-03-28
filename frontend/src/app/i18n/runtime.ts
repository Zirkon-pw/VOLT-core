import type { LocalizationPayload } from '@api/settings/types';

export type TranslationParams = Record<string, string | number>;

const fallbackMessages: Record<string, string> = {
  'common.close': 'Close',
  'common.reload': 'Reload',
  'errorBoundary.title': 'Something went wrong',
  'errorBoundary.description': 'An unexpected error occurred.',
};

let currentLocalization: LocalizationPayload = {
  selectedLocale: 'auto',
  effectiveLocale: 'en',
  availableLocales: [],
  messages: { ...fallbackMessages },
};

export function setLocalizationRuntime(localization: LocalizationPayload) {
  currentLocalization = {
    ...localization,
    availableLocales: [...localization.availableLocales],
    messages: { ...localization.messages },
  };

  if (typeof document !== 'undefined') {
    document.documentElement.lang = localization.effectiveLocale;
  }
}

export function translate(key: string, params?: TranslationParams): string {
  const template = currentLocalization.messages[key] ?? fallbackMessages[key] ?? key;
  if (params == null) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, paramName: string) => {
    const value = params[paramName];
    return value == null ? `{${paramName}}` : String(value);
  });
}

export function getEffectiveLocale(): string {
  return currentLocalization.effectiveLocale;
}
