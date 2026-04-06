import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { FileEntry } from '@shared/api/file/types';

/**
 * Service interface for file tree access from kernel code.
 * The file-tree plugin registers its store at startup.
 * This avoids kernel → plugins dependency direction while preserving reactivity.
 */

export interface FileTreeStoreShape {
  trees: Record<string, FileEntry[]>;
  expandedPaths: Record<string, string[]>;
  selectedPath: Record<string, string | null>;
  startCreate: (voltId: string, parentPath: string, isDir: boolean) => void;
  notifyFsMutation: (voltId: string, voltPath: string) => Promise<void>;
}

// Fallback empty store used before the real store is registered
const emptyStore = create<FileTreeStoreShape>(() => ({
  trees: {},
  expandedPaths: {},
  selectedPath: {},
  startCreate: () => {},
  notifyFsMutation: async () => {},
}));

let registeredStore: UseBoundStore<StoreApi<FileTreeStoreShape>> = emptyStore;

export function registerFileTreeStore(store: UseBoundStore<StoreApi<FileTreeStoreShape>>): void {
  registeredStore = store;
}

/**
 * Reactive hook — use inside React components.
 * Delegates to the plugin-registered store for proper Zustand reactivity.
 */
export function useFileTreeServiceStore<T>(selector: (state: FileTreeStoreShape) => T): T {
  return registeredStore(selector);
}

/** Imperative access for non-React code */
export function getFileTreeServiceStore(): FileTreeStoreShape {
  return registeredStore.getState();
}
