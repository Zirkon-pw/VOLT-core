export type ThemeMode = 'light' | 'dark';
export type ThemeSource = 'builtin' | 'custom';

export const THEME_TOKEN_KEYS = [
  '--font-family',
  '--font-display',
  '--font-mono',
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-bg-hover',
  '--color-bg-active',
  '--color-surface-raised',
  '--color-surface-elevated',
  '--color-surface-overlay',
  '--color-surface-chrome',
  '--color-surface-sunken',
  '--surface-solid-primary',
  '--surface-solid-secondary',
  '--surface-solid-tertiary',
  '--surface-border-primary',
  '--surface-border-secondary',
  '--surface-translucent-primary',
  '--surface-translucent-secondary',
  '--color-selection-bg',
  '--color-selection-border',
  '--color-focus-ring',
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
  '--color-icon-coral',
  '--color-icon-sage',
  '--color-icon-sky',
  '--color-icon-butter',
  '--color-icon-plum',
  '--color-icon-olive',
  '--color-icon-slate',
  '--color-success',
  '--color-warning',
  '--color-error',
  '--color-danger-bg',
  '--color-danger',
  '--color-tint-sage',
  '--color-tint-blue',
  '--color-tint-lilac',
  '--color-tint-butter',
  '--color-tint-rose',
  '--color-shadow',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-popup',
  '--shadow-floating',
  '--overlay-backdrop',
  '--code-color-text',
  '--code-color-comment',
  '--code-color-keyword',
  '--code-color-function',
  '--code-color-string',
  '--code-color-number',
  '--code-color-class',
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
  tokens: Partial<Record<string, string>>;
}

export interface ThemeExportV2 {
  version: 2;
  name: string;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
}

export type ThemeExport = ThemeExportV1 | ThemeExportV2;

const SHARED_FONT_TOKENS = {
  '--font-family': "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  '--font-display': "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  '--font-mono': "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
} satisfies Partial<ThemeTokens>;

const LIGHT_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#fdfcf8',
  '--color-bg-secondary': '#f5f2eb',
  '--color-bg-tertiary': '#ece8de',
  '--color-bg-hover': 'rgba(35, 157, 173, 0.08)',
  '--color-bg-active': 'rgba(35, 157, 173, 0.14)',
  '--color-surface-raised': '#f7f4ee',
  '--color-surface-elevated': 'rgba(247, 244, 238, 0.95)',
  '--color-surface-overlay': '#fbfaf6',
  '--color-surface-chrome': '#eeebe3',
  '--color-surface-sunken': '#e7e2d7',
  '--surface-solid-primary': '#f7f4ee',
  '--surface-solid-secondary': '#f4f1ea',
  '--surface-solid-tertiary': '#eeebe2',
  '--surface-border-primary': 'rgba(95, 102, 109, 0.24)',
  '--surface-border-secondary': 'rgba(95, 102, 109, 0.16)',
  '--surface-translucent-primary': 'rgba(247, 244, 238, 0.86)',
  '--surface-translucent-secondary': 'rgba(244, 241, 234, 0.82)',
  '--color-selection-bg': 'rgba(35, 157, 173, 0.16)',
  '--color-selection-border': 'rgba(31, 135, 149, 0.36)',
  '--color-focus-ring': 'rgba(35, 157, 173, 0.22)',
  '--color-text-primary': '#1f2328',
  '--color-text-secondary': '#5f666d',
  '--color-text-tertiary': '#899098',
  '--color-text-inverse': '#fdfcf8',
  '--color-accent': '#239dad',
  '--color-accent-hover': '#1f8795',
  '--color-accent-text': '#f7fbfc',
  '--color-border': '#d4d0c5',
  '--color-border-strong': '#b9b5aa',
  '--color-divider': 'rgba(31, 35, 40, 0.1)',
  '--color-icon': '#7a838b',
  '--color-icon-hover': '#1f2328',
  '--color-icon-coral': '#b97969',
  '--color-icon-sage': '#5f8778',
  '--color-icon-sky': '#5d7f9f',
  '--color-icon-butter': '#9d8547',
  '--color-icon-plum': '#7b7195',
  '--color-icon-olive': '#78804f',
  '--color-icon-slate': '#73828e',
  '--color-success': '#4f7d72',
  '--color-warning': '#9b7a42',
  '--color-error': '#a35d5a',
  '--color-danger-bg': 'rgba(163, 93, 90, 0.12)',
  '--color-danger': '#a35d5a',
  '--color-tint-sage': '#dde7e0',
  '--color-tint-blue': '#dce8ee',
  '--color-tint-lilac': '#e4e0ec',
  '--color-tint-butter': '#ebe4cf',
  '--color-tint-rose': '#ece1e2',
  '--color-shadow': '#1f2328',
  '--shadow-sm': '0 1px 2px rgba(31, 35, 40, 0.04)',
  '--shadow-md': '0 8px 24px rgba(31, 35, 40, 0.06)',
  '--shadow-lg': '0 18px 48px rgba(31, 35, 40, 0.08)',
  '--shadow-popup': '0 18px 40px rgba(31, 35, 40, 0.12)',
  '--shadow-floating': '0 10px 26px rgba(31, 35, 40, 0.12)',
  '--overlay-backdrop': 'rgba(20, 23, 25, 0.2)',
  '--code-color-text': '#263039',
  '--code-color-comment': '#7f878d',
  '--code-color-keyword': '#2a8792',
  '--code-color-function': '#4d706a',
  '--code-color-string': '#8a6e42',
  '--code-color-number': '#5373a3',
  '--code-color-class': '#566c86',
};

const DARK_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#161a1d',
  '--color-bg-secondary': '#1b2024',
  '--color-bg-tertiary': '#262c31',
  '--color-bg-hover': 'rgba(57, 182, 197, 0.08)',
  '--color-bg-active': 'rgba(57, 182, 197, 0.14)',
  '--color-surface-raised': '#1f2529',
  '--color-surface-elevated': 'rgba(31, 37, 41, 0.94)',
  '--color-surface-overlay': '#242b30',
  '--color-surface-chrome': '#1b2125',
  '--color-surface-sunken': '#111417',
  '--surface-solid-primary': '#1f2529',
  '--surface-solid-secondary': '#1a2024',
  '--surface-solid-tertiary': '#171c1f',
  '--surface-border-primary': 'rgba(231, 236, 239, 0.16)',
  '--surface-border-secondary': 'rgba(231, 236, 239, 0.1)',
  '--surface-translucent-primary': 'rgba(31, 37, 41, 0.88)',
  '--surface-translucent-secondary': 'rgba(26, 32, 36, 0.82)',
  '--color-selection-bg': 'rgba(57, 182, 197, 0.18)',
  '--color-selection-border': 'rgba(57, 182, 197, 0.36)',
  '--color-focus-ring': 'rgba(57, 182, 197, 0.24)',
  '--color-text-primary': '#e7ecef',
  '--color-text-secondary': '#a3adb4',
  '--color-text-tertiary': '#748089',
  '--color-text-inverse': '#161a1d',
  '--color-accent': '#39b6c5',
  '--color-accent-hover': '#52bfce',
  '--color-accent-text': '#102326',
  '--color-border': 'rgba(231, 236, 239, 0.12)',
  '--color-border-strong': 'rgba(231, 236, 239, 0.24)',
  '--color-divider': 'rgba(231, 236, 239, 0.08)',
  '--color-icon': 'rgba(231, 236, 239, 0.58)',
  '--color-icon-hover': '#f1f5f7',
  '--color-icon-coral': '#c38c7e',
  '--color-icon-sage': '#77a192',
  '--color-icon-sky': '#7e9fba',
  '--color-icon-butter': '#b79b5d',
  '--color-icon-plum': '#9386b2',
  '--color-icon-olive': '#8d9860',
  '--color-icon-slate': '#8e9ca7',
  '--color-success': '#79a494',
  '--color-warning': '#b39358',
  '--color-error': '#c77974',
  '--color-danger-bg': 'rgba(199, 121, 116, 0.14)',
  '--color-danger': '#d69894',
  '--color-tint-sage': '#26312d',
  '--color-tint-blue': '#26343d',
  '--color-tint-lilac': '#302d3b',
  '--color-tint-butter': '#353022',
  '--color-tint-rose': '#35282b',
  '--color-shadow': '#000000',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.18)',
  '--shadow-md': '0 10px 28px rgba(0, 0, 0, 0.24)',
  '--shadow-lg': '0 18px 44px rgba(0, 0, 0, 0.28)',
  '--shadow-popup': '0 20px 48px rgba(0, 0, 0, 0.34)',
  '--shadow-floating': '0 14px 30px rgba(0, 0, 0, 0.32)',
  '--overlay-backdrop': 'rgba(9, 11, 12, 0.58)',
  '--code-color-text': '#e7ecef',
  '--code-color-comment': '#7f8b92',
  '--code-color-keyword': '#44b1be',
  '--code-color-function': '#82a9a0',
  '--code-color-string': '#c9a86d',
  '--code-color-number': '#87a8d0',
  '--code-color-class': '#9cc0de',
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
  tokens?: Partial<Record<ThemeTokenKey, string>> | Partial<Record<string, string>> | null,
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
    tokens?: Partial<Record<string, string>>;
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

export function toThemeExport(theme: ThemeDefinition): ThemeExportV2 {
  return {
    version: 2,
    name: theme.name,
    baseMode: theme.baseMode,
    tokens: cloneThemeTokens(theme.tokens),
  };
}

export function normalizeThemeImport(value: unknown): ThemeExportV2 {
  if (!value || typeof value !== 'object') {
    throw new Error('Theme import must be a JSON object.');
  }

  const candidate = value as Partial<ThemeExport> & {
    tokens?: Partial<Record<string, string>>;
  };

  if (candidate.version !== 1 && candidate.version !== 2) {
    throw new Error('Unsupported theme version. Expected version 1 or 2.');
  }

  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    throw new Error('Theme name is required.');
  }

  if (!isThemeMode(candidate.baseMode)) {
    throw new Error('Theme baseMode must be "light" or "dark".');
  }

  return {
    version: 2,
    name: candidate.name.trim(),
    baseMode: candidate.baseMode,
    tokens: mergeThemeTokens(candidate.baseMode, candidate.tokens),
  };
}
