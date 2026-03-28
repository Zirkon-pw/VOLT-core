export type ThemeMode = 'light' | 'dark';
export type ThemeSource = 'builtin' | 'custom';

export const THEME_TOKEN_KEYS = [
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-bg-hover',
  '--color-bg-active',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-text-inverse',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-text',
  '--color-border',
  '--color-border-strong',
  '--color-divider',
  '--color-icon',
  '--color-icon-hover',
  '--color-success',
  '--color-warning',
  '--color-error',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-popup',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemeDefinition {
  id: string;
  name: string;
  source: ThemeSource;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeExportV1 {
  version: 1;
  name: string;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
}

const LIGHT_THEME_TOKENS: ThemeTokens = {
  '--color-bg-primary': '#ffffff',
  '--color-bg-secondary': '#f7f7f5',
  '--color-bg-tertiary': '#f0f0ee',
  '--color-bg-hover': 'rgba(55, 53, 47, 0.04)',
  '--color-bg-active': 'rgba(55, 53, 47, 0.08)',
  '--color-text-primary': '#37352f',
  '--color-text-secondary': '#787774',
  '--color-text-tertiary': '#b4b4b0',
  '--color-text-inverse': '#ffffff',
  '--color-accent': '#2eaadc',
  '--color-accent-hover': '#2496c4',
  '--color-accent-text': '#ffffff',
  '--color-border': '#e9e9e7',
  '--color-border-strong': '#d3d3d0',
  '--color-divider': '#ebebea',
  '--color-icon': '#a4a4a0',
  '--color-icon-hover': '#37352f',
  '--color-success': '#4daa57',
  '--color-warning': '#cb912f',
  '--color-error': '#e03e3e',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
  '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
  '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
  '--shadow-popup': '0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
};

const DARK_THEME_TOKENS: ThemeTokens = {
  '--color-bg-primary': '#191919',
  '--color-bg-secondary': '#202020',
  '--color-bg-tertiary': '#2f2f2f',
  '--color-bg-hover': 'rgba(255, 255, 255, 0.06)',
  '--color-bg-active': 'rgba(255, 255, 255, 0.1)',
  '--color-text-primary': 'rgba(255, 255, 255, 0.81)',
  '--color-text-secondary': 'rgba(255, 255, 255, 0.45)',
  '--color-text-tertiary': 'rgba(255, 255, 255, 0.28)',
  '--color-text-inverse': '#191919',
  '--color-accent': '#529cca',
  '--color-accent-hover': '#448db8',
  '--color-accent-text': '#ffffff',
  '--color-border': 'rgba(255, 255, 255, 0.09)',
  '--color-border-strong': 'rgba(255, 255, 255, 0.16)',
  '--color-divider': 'rgba(255, 255, 255, 0.07)',
  '--color-icon': 'rgba(255, 255, 255, 0.4)',
  '--color-icon-hover': 'rgba(255, 255, 255, 0.81)',
  '--color-success': '#4daa57',
  '--color-warning': '#cb912f',
  '--color-error': '#e03e3e',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.2)',
  '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.3)',
  '--shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
  '--shadow-popup': '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
};

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Light',
    source: 'builtin',
    baseMode: 'light',
    tokens: LIGHT_THEME_TOKENS,
  },
  {
    id: 'dark',
    name: 'Dark',
    source: 'builtin',
    baseMode: 'dark',
    tokens: DARK_THEME_TOKENS,
  },
];

const BUILTIN_THEME_MAP = BUILTIN_THEMES.reduce<Record<string, ThemeDefinition>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {});

const BUILTIN_THEME_BY_MODE: Record<ThemeMode, ThemeDefinition> = {
  light: BUILTIN_THEME_MAP.light,
  dark: BUILTIN_THEME_MAP.dark,
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function cloneThemeTokens(tokens: ThemeTokens): ThemeTokens {
  return THEME_TOKEN_KEYS.reduce((acc, key) => {
    acc[key] = tokens[key];
    return acc;
  }, {} as ThemeTokens);
}

export function mergeThemeTokens(
  baseMode: ThemeMode,
  tokens?: Partial<Record<ThemeTokenKey, string>> | null,
): ThemeTokens {
  const baseTokens = BUILTIN_THEME_BY_MODE[baseMode].tokens;

  return THEME_TOKEN_KEYS.reduce((acc, key) => {
    const value = tokens?.[key];
    acc[key] = typeof value === 'string' && value.trim().length > 0 ? value.trim() : baseTokens[key];
    return acc;
  }, {} as ThemeTokens);
}

export function getBuiltinThemeByMode(mode: ThemeMode): ThemeDefinition {
  return BUILTIN_THEME_BY_MODE[mode];
}

export function getThemeById(
  themeId: string | null | undefined,
  customThemes: ThemeDefinition[],
): ThemeDefinition | undefined {
  if (!themeId) return undefined;
  return BUILTIN_THEME_MAP[themeId] ?? customThemes.find((theme) => theme.id === themeId);
}

export function applyThemeTokens(target: HTMLElement, tokens: ThemeTokens): void {
  THEME_TOKEN_KEYS.forEach((key) => {
    target.style.setProperty(key, tokens[key]);
  });
}

export function createThemeId(): string {
  return `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getNextCustomThemeName(existingNames: string[]): string {
  const baseName = 'Custom theme';
  if (!existingNames.includes(baseName)) return baseName;

  let suffix = 2;
  while (existingNames.includes(`${baseName} ${suffix}`)) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
}

export function createCustomThemeDefinition(input: {
  name: string;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
}): ThemeDefinition {
  const now = new Date().toISOString();

  return {
    id: createThemeId(),
    name: input.name.trim() || 'Custom theme',
    source: 'custom',
    baseMode: input.baseMode,
    tokens: cloneThemeTokens(input.tokens),
    createdAt: now,
    updatedAt: now,
  };
}

export function sanitizeStoredCustomTheme(value: unknown): ThemeDefinition | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<ThemeDefinition> & {
    tokens?: Partial<Record<ThemeTokenKey, string>>;
  };

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return null;
  if (!isThemeMode(candidate.baseMode)) return null;

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    source: 'custom',
    baseMode: candidate.baseMode,
    tokens: mergeThemeTokens(candidate.baseMode, candidate.tokens),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  };
}

export function toThemeExport(theme: ThemeDefinition): ThemeExportV1 {
  return {
    version: 1,
    name: theme.name,
    baseMode: theme.baseMode,
    tokens: cloneThemeTokens(theme.tokens),
  };
}

export function normalizeThemeImport(value: unknown): ThemeExportV1 {
  if (!value || typeof value !== 'object') {
    throw new Error('Theme import must be a JSON object.');
  }

  const candidate = value as Partial<ThemeExportV1> & {
    tokens?: Partial<Record<ThemeTokenKey, string>>;
  };

  if (candidate.version !== 1) {
    throw new Error('Unsupported theme version. Expected version 1.');
  }

  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    throw new Error('Theme name is required.');
  }

  if (!isThemeMode(candidate.baseMode)) {
    throw new Error('Theme baseMode must be "light" or "dark".');
  }

  return {
    version: 1,
    name: candidate.name.trim(),
    baseMode: candidate.baseMode,
    tokens: mergeThemeTokens(candidate.baseMode, candidate.tokens),
  };
}
