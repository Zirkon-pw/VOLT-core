import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { LocalizationPayload } from '@shared/i18n';
import { useAppSettingsStore } from '@plugins/settings/SettingsStore';
import { translate, type TranslationParams } from '@shared/i18n';

interface I18nContextValue extends LocalizationPayload {
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: string) => Promise<LocalizationPayload>;
  refreshLocalization: () => Promise<LocalizationPayload>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const localization = useAppSettingsStore((state) => state.localization);
  const refreshLocalization = useAppSettingsStore((state) => state.refreshLocalization);
  const setLocale = useAppSettingsStore((state) => state.setLocale);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void refreshLocalization()
      .then(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (value == null) {
    return <div>Loading...</div>;
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
