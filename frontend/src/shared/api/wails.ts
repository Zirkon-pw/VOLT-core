import { WAILS } from '@shared/config/constants';

declare global {
  interface Window {
    go?: {
      wailshandler?: Record<string, unknown>;
    };
  }
}

let pendingWailsReady: Promise<void> | null = null;

const REQUIRED_WAILS_HANDLERS = {
  FileHandler: ['ReadFile', 'WriteFile', 'ListTree', 'CreateFile', 'CreateDirectory', 'DeletePath', 'RenamePath'],
  DialogHandler: ['SelectDirectory', 'PickFiles', 'PickImage'],
  ProcessHandler: ['Start', 'Cancel'],
  StorageHandler: ['Get', 'Set', 'Delete', 'List'],
} as const;

function hasHandlerMethods(target: unknown, methods: readonly string[]): boolean {
  if (target == null || typeof target !== 'object') {
    return false;
  }

  return methods.every((methodName) => typeof (target as Record<string, unknown>)[methodName] === 'function');
}

function hasWailsBridge(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const handlers = window.go?.wailshandler;
  if (handlers == null) {
    return false;
  }

  return Object.entries(REQUIRED_WAILS_HANDLERS).every(([handlerName, methods]) => (
    hasHandlerMethods(handlers[handlerName], methods)
  ));
}

export async function waitForWailsBridge(timeoutMs = WAILS.READY_TIMEOUT_MS): Promise<void> {
  if (hasWailsBridge()) {
    return;
  }

  if (pendingWailsReady == null) {
    pendingWailsReady = new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();

      const check = () => {
        if (hasWailsBridge()) {
          pendingWailsReady = null;
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          pendingWailsReady = null;
          reject(new Error('Wails runtime is not ready yet'));
          return;
        }

        window.setTimeout(check, WAILS.POLL_MS);
      };

      check();
    });
  }

  return pendingWailsReady;
}

export async function invokeWails<TModule, TResult>(
  loadModule: () => Promise<TModule>,
  invoke: (module: TModule) => TResult | Promise<TResult>,
): Promise<TResult> {
  await waitForWailsBridge();
  const module = await loadModule();
  return invoke(module);
}
