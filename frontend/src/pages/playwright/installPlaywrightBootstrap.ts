declare global {
  interface Window {
    go?: {
      wailshandler?: Record<string, unknown>;
    };
    runtime?: {
      BrowserOpenURL?: (url: string) => void;
    };
  }
}

export function installPlaywrightBootstrap() {
  const localization = {
    selectedLocale: 'en',
    effectiveLocale: 'en',
    availableLocales: [{ code: 'en', label: 'English', source: 'builtin' }],
    messages: {},
  };

  window.go = {
    ...(window.go ?? {}),
    wailshandler: {
      ...(window.go?.wailshandler ?? {}),
      SettingsHandler: {
        GetLocalization: async () => localization,
        SetLocale: async () => localization,
      },
      PluginCatalogHandler: {
        ListPlugins: async () => [],
        GetPluginsDirectory: async () => '',
        PickPluginArchive: async () => '',
        ImportPluginArchive: async () => {
          throw new Error('Import is not available in Playwright bootstrap');
        },
        DeletePlugin: async () => undefined,
        SetPluginEnabled: async () => undefined,
      },
    },
  };

  window.runtime = {
    ...(window.runtime ?? {}),
    BrowserOpenURL: window.runtime?.BrowserOpenURL ?? (() => undefined),
  };
}
