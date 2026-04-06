import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { LocalizationPayload } from '@shared/i18n';
import { useAppSettingsStore } from '@plugins/settings/SettingsStore';
import {
  getFallbackLocalization,
  setLocalizationRuntime,
  translate,
  type TranslationParams,
} from '@shared/i18n';

interface I18nContextValue extends LocalizationPayload {
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: string) => Promise<LocalizationPayload>;
  refreshLocalization: () => Promise<LocalizationPayload>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getPreferredLocales(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  const locales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return Array.from(new Set(locales));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const localization = useAppSettingsStore((state) => state.localization);
  const refreshLocalization = useAppSettingsStore((state) => state.refreshLocalization);
  const setLocale = useAppSettingsStore((state) => state.setLocale);
  const fallbackLocalization = useMemo(
    () => getFallbackLocalization(getPreferredLocales()),
    [],
  );

  useEffect(() => {
    void refreshLocalization()
      .catch((err) => {
        console.warn('Volt localization bridge is not ready, using fallback locale.', err);
      });
  }, [refreshLocalization]);

  const value = useMemo(() => {
    const nextLocalization = localization ?? fallbackLocalization;
    setLocalizationRuntime(nextLocalization);
    return {
      ...nextLocalization,
      t: translate,
      setLocale,
      refreshLocalization,
    };
  }, [fallbackLocalization, localization, refreshLocalization, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context == null) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
