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
  '--font-family': "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-display': "'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  '--font-mono': "'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
} satisfies Partial<ThemeTokens>;

const LIGHT_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#f5f1ea',
  '--color-bg-secondary': '#ece5db',
  '--color-bg-tertiary': '#e1d8cb',
  '--color-bg-hover': 'rgba(98, 84, 70, 0.07)',
  '--color-bg-active': 'rgba(98, 84, 70, 0.12)',
  '--color-surface-raised': '#fbf8f3',
  '--color-surface-elevated': 'rgba(250, 247, 242, 0.94)',
  '--color-surface-overlay': '#f7f3ee',
  '--color-surface-chrome': '#e8e1d7',
  '--color-surface-sunken': '#ddd4c8',
  '--color-selection-bg': 'rgba(198, 123, 98, 0.16)',
  '--color-selection-border': 'rgba(198, 123, 98, 0.38)',
  '--color-focus-ring': 'rgba(198, 123, 98, 0.18)',
  '--color-text-primary': '#40362f',
  '--color-text-secondary': '#6e6258',
  '--color-text-tertiary': '#9a8e81',
  '--color-text-inverse': '#fcf8f2',
  '--color-accent': '#c67b62',
  '--color-accent-hover': '#b96d54',
  '--color-accent-text': '#fff9f4',
  '--color-border': '#d4c8ba',
  '--color-border-strong': '#c0b3a2',
  '--color-divider': 'rgba(91, 76, 61, 0.14)',
  '--color-icon': '#8f847a',
  '--color-icon-hover': '#55483f',
  '--color-icon-coral': '#cd8c7f',
  '--color-icon-sage': '#8da286',
  '--color-icon-sky': '#819ab7',
  '--color-icon-butter': '#c5aa68',
  '--color-icon-plum': '#a38ebd',
  '--color-icon-olive': '#9ca167',
  '--color-icon-slate': '#87919d',
  '--color-success': '#698868',
  '--color-warning': '#c59a53',
  '--color-error': '#c16f68',
  '--color-danger-bg': 'rgba(193, 111, 104, 0.12)',
  '--color-danger': '#c16f68',
  '--color-tint-sage': '#dde5db',
  '--color-tint-blue': '#dbe2ee',
  '--color-tint-lilac': '#e6deef',
  '--color-tint-butter': '#eee2c5',
  '--color-tint-rose': '#eddad8',
  '--color-shadow': '#43372e',
  '--shadow-sm': '0 10px 24px -20px rgba(67, 55, 46, 0.28), 0 2px 4px rgba(67, 55, 46, 0.05)',
  '--shadow-md': '0 18px 42px -30px rgba(67, 55, 46, 0.32), 0 10px 18px -16px rgba(67, 55, 46, 0.11)',
  '--shadow-lg': '0 28px 60px -36px rgba(67, 55, 46, 0.36), 0 14px 28px -20px rgba(67, 55, 46, 0.14)',
  '--shadow-popup': '0 24px 48px -30px rgba(67, 55, 46, 0.34), 0 0 0 1px rgba(212, 200, 186, 0.64)',
  '--shadow-floating': '0 34px 72px -42px rgba(67, 55, 46, 0.38), 0 0 0 1px rgba(212, 200, 186, 0.52)',
  '--overlay-backdrop': 'rgba(36, 29, 23, 0.18)',
  '--code-color-text': '#3e332c',
  '--code-color-comment': '#8d8175',
  '--code-color-keyword': '#9f5e73',
  '--code-color-function': '#4c8278',
  '--code-color-string': '#a97b3f',
  '--code-color-number': '#8365b2',
  '--code-color-class': '#55769b',
};

const DARK_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#1c1b1a',
  '--color-bg-secondary': '#242221',
  '--color-bg-tertiary': '#2d2a29',
  '--color-bg-hover': 'rgba(245, 236, 225, 0.05)',
  '--color-bg-active': 'rgba(245, 220, 195, 0.08)',
  '--color-surface-raised': '#282523',
  '--color-surface-elevated': 'rgba(39, 36, 34, 0.94)',
  '--color-surface-overlay': '#2d2926',
  '--color-surface-chrome': '#252220',
  '--color-surface-sunken': '#171615',
  '--color-selection-bg': 'rgba(221, 161, 115, 0.16)',
  '--color-selection-border': 'rgba(221, 161, 115, 0.34)',
  '--color-focus-ring': 'rgba(221, 161, 115, 0.22)',
  '--color-text-primary': '#eee3d6',
  '--color-text-secondary': '#c3b6a8',
  '--color-text-tertiary': '#8f8377',
  '--color-text-inverse': '#1c1b1a',
  '--color-accent': '#dda173',
  '--color-accent-hover': '#e6ac81',
  '--color-accent-text': '#251f1a',
  '--color-border': 'rgba(235, 223, 210, 0.11)',
  '--color-border-strong': 'rgba(235, 223, 210, 0.2)',
  '--color-divider': 'rgba(235, 223, 210, 0.09)',
  '--color-icon': 'rgba(224, 212, 200, 0.62)',
  '--color-icon-hover': '#f1e7db',
  '--color-icon-coral': '#df9d92',
  '--color-icon-sage': '#9bb994',
  '--color-icon-sky': '#93add1',
  '--color-icon-butter': '#d8b878',
  '--color-icon-plum': '#b29dd0',
  '--color-icon-olive': '#b0b06f',
  '--color-icon-slate': '#a6b0bc',
  '--color-success': '#8aad91',
  '--color-warning': '#cea765',
  '--color-error': '#d18379',
  '--color-danger-bg': 'rgba(209, 131, 121, 0.14)',
  '--color-danger': '#e7aaa0',
  '--color-tint-sage': '#39433d',
  '--color-tint-blue': '#34404b',
  '--color-tint-lilac': '#433a49',
  '--color-tint-butter': '#494233',
  '--color-tint-rose': '#493738',
  '--color-shadow': '#000000',
  '--shadow-sm': '0 12px 24px -18px rgba(0, 0, 0, 0.42), 0 2px 4px rgba(0, 0, 0, 0.2)',
  '--shadow-md': '0 20px 42px -26px rgba(0, 0, 0, 0.48), 0 12px 22px -18px rgba(0, 0, 0, 0.27)',
  '--shadow-lg': '0 30px 60px -30px rgba(0, 0, 0, 0.52), 0 16px 30px -22px rgba(0, 0, 0, 0.33)',
  '--shadow-popup': '0 24px 50px -28px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(235, 223, 210, 0.08)',
  '--shadow-floating': '0 34px 80px -36px rgba(0, 0, 0, 0.66), 0 0 0 1px rgba(235, 223, 210, 0.1)',
  '--overlay-backdrop': 'rgba(0, 0, 0, 0.46)',
  '--code-color-text': '#efe6dd',
  '--code-color-comment': '#8f8377',
  '--code-color-keyword': '#e6a2be',
  '--code-color-function': '#89c3a5',
  '--code-color-string': '#e9c189',
  '--code-color-number': '#c6aaef',
  '--code-color-class': '#8eb7d7',
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
