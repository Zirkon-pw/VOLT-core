import { useWorkspaceStore } from './model';

export const WorkspaceManager = {
  openWorkspace: useWorkspaceStore.getState().openWorkspace,
  closeWorkspace: useWorkspaceStore.getState().closeWorkspace,
  setActiveWorkspace: useWorkspaceStore.getState().setActiveWorkspace,
};
