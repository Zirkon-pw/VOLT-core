import type { SearchFileTextProvider } from '@kernel/plugin-system/api/PluginApiV5';

export function createSearchProvider(config: SearchFileTextProvider): SearchFileTextProvider {
  return config;
}
