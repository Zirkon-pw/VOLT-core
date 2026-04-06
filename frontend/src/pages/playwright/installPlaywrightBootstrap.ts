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
  const storageEntries = new Map<string, unknown>();

  window.go = {
    ...(window.go ?? {}),
    wailshandler: {
      ...(window.go?.wailshandler ?? {}),
      FileHandler: {
        Read: async () => '',
        Write: async () => undefined,
        ListTree: async () => [],
        CreateFile: async () => undefined,
        CreateDirectory: async () => undefined,
        Delete: async () => undefined,
        Rename: async () => undefined,
      },
      DialogHandler: {
        SelectDirectory: async () => '',
        PickFiles: async () => [],
        PickImage: async () => '',
      },
      ProcessHandler: {
        Start: async () => undefined,
        Cancel: async () => undefined,
      },
      StorageHandler: {
        ConfigDir: async () => '/playwright/.volt',
        Get: async (namespace: string, key: string) => {
          const storageKey = `${namespace}:${key}`;
          if (!storageEntries.has(storageKey)) {
            throw new Error('key not found');
          }
          return storageEntries.get(storageKey);
        },
        Set: async (namespace: string, key: string, value: unknown) => {
          storageEntries.set(`${namespace}:${key}`, value);
        },
        Delete: async (namespace: string, key: string) => {
          storageEntries.delete(`${namespace}:${key}`);
        },
        List: async (namespace: string) => {
          const prefix = `${namespace}:`;
          return Array.from(storageEntries.entries())
            .filter(([storageKey]) => storageKey.startsWith(prefix))
            .map(([storageKey, value]) => ({
              key: storageKey.slice(prefix.length),
              value,
            }));
        },
      },
    },
  };

  window.runtime = {
    ...(window.runtime ?? {}),
    BrowserOpenURL: window.runtime?.BrowserOpenURL ?? (() => undefined),
  };
}
