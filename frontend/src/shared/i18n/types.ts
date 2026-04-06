export interface AvailableLocale {
  code: string;
  label: string;
  source: 'builtin' | 'custom';
}

export interface LocalizationPayload {
  selectedLocale: string;
  effectiveLocale: string;
  availableLocales: AvailableLocale[];
  messages: Record<string, string>;
}
