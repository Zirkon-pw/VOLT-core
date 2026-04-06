import { useTabStore } from '@entities/tab';
import type { PaneId } from './workspaceViewStore';
import { useWorkspaceViewStore } from './workspaceViewStore';

function getTargetPane(voltId: string): PaneId {
  return useWorkspaceViewStore.getState().views[voltId]?.activePane ?? 'primary';
}

export function openFileInPane(
  voltId: string,
  filePath: string,
  fileName: string,
  paneId: PaneId,
): void {
  const tabStore = useTabStore.getState();

  if (paneId === 'secondary') {
    tabStore.openTab(voltId, filePath, fileName, { activate: false });
    useWorkspaceViewStore.getState().openInSecondary(voltId, filePath);
    tabStore.setActiveTab(voltId, filePath);
    return;
  }

  tabStore.openTab(voltId, filePath, fileName, { activate: false });
  useWorkspaceViewStore.getState().openInPrimary(voltId, filePath);
  tabStore.setActiveTab(voltId, filePath);
}

export function openFileInActivePane(voltId: string, filePath: string, fileName: string): void {
  openFileInPane(voltId, filePath, fileName, getTargetPane(voltId));
}

export function openFileInSecondaryPane(voltId: string, filePath: string, fileName: string): void {
  openFileInPane(voltId, filePath, fileName, 'secondary');
}
