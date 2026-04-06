import { useTabStore } from '@kernel/workspace/tabs/model';

/**
 * Cross-store effects that synchronize tab state after file-tree mutations.
 * Extracted from fileTreeStore to make cross-store dependencies explicit.
 */

export function syncTabsOnFileCreate(voltId: string, path: string, displayName: string) {
  useTabStore.getState().openTab(voltId, path, displayName);
}

export function syncTabsOnRename(voltId: string, oldPath: string, newPath: string, isDir: boolean) {
  if (isDir) {
    useTabStore.getState().replacePathPrefix(voltId, oldPath, newPath);
  } else {
    useTabStore.getState().renamePath(voltId, oldPath, newPath);
  }
}

export function syncTabsOnDelete(voltId: string, path: string, isDir: boolean) {
  if (isDir) {
    useTabStore.getState().removePathPrefix(voltId, path);
  } else {
    useTabStore.getState().removePath(voltId, path);
  }
}
