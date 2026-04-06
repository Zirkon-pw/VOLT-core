import { useWorkspaceStore } from '@entities/workspace';

export const WorkspaceManager = {
  openWorkspace: useWorkspaceStore.getState().openWorkspace,
  closeWorkspace: useWorkspaceStore.getState().closeWorkspace,
  setActiveWorkspace: useWorkspaceStore.getState().setActiveWorkspace,
};
