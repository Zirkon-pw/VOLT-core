import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getLocalization, setLocale as persistLocale } from '@api/settings';
import type { LocalizationPayload } from '@api/settings';
import { setLocalizationRuntime, translate, type TranslationParams } from '@app/i18n/runtime';

interface I18nContextValue extends LocalizationPayload {
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: string) => Promise<void>;
  refreshLocalization: () => Promise<void>;
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
  const [localization, setLocalization] = useState<LocalizationPayload | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const applyLocalization = useCallback((payload: LocalizationPayload) => {
    setLocalizationRuntime(payload);
    setLocalization(payload);
  }, []);

  const refreshLocalization = useCallback(async () => {
    const payload = await getLocalization(getPreferredLocales());
    applyLocalization(payload);
  }, [applyLocalization]);

  const setLocale = useCallback(async (locale: string) => {
    const payload = await persistLocale(locale, getPreferredLocales());
    applyLocalization(payload);
  }, [applyLocalization]);

  useEffect(() => {
    let cancelled = false;

    void refreshLocalization().catch((err) => {
      if (!cancelled) {
        setError(err as Error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshLocalization]);

  const value = localization == null ? null : {
    ...localization,
    t: translate,
    setLocale,
    refreshLocalization,
  };

  if (error) {
    throw error;
  }

  if (value == null) {
    return null;
  }

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
