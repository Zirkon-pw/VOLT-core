import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAppSettingsStore, type AppTheme } from '@plugins/settings/SettingsStore';
import { applyThemeTokens, getBuiltinThemeByMode } from '@shared/config/theme';

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppSettingsStore((state) => state.settings.theme);
  const setTheme = useAppSettingsStore((state) => state.setTheme);
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
  }), [setTheme, theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    applyThemeTokens(document.documentElement, getBuiltinThemeByMode(theme).tokens);
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
