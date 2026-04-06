import { create, type StoreApi, type UseBoundStore } from 'zustand';

/**
 * Service interface for app settings access from kernel code.
 * The settings plugin registers its store at startup.
 */

export interface AppSettingsStoreShape {
  settings: { imageDir: string };
}

const emptyStore = create<AppSettingsStoreShape>(() => ({
  settings: { imageDir: 'images' },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let registeredStore: UseBoundStore<StoreApi<any>> = emptyStore;

export function registerAppSettingsStore(store: UseBoundStore<StoreApi<{ settings: { imageDir: string } }>>): void {
  registeredStore = store;
}

export function useAppSettingsServiceStore<T>(selector: (state: AppSettingsStoreShape) => T): T {
  return registeredStore(selector);
}

export function getAppSettingsServiceStore(): AppSettingsStoreShape {
  return registeredStore.getState();
}
