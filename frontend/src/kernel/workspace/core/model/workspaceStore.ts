import { create } from 'zustand';

export interface WorkspaceTab {
  voltId: string;
  voltName: string;
  voltPath: string;
}

interface WorkspaceState {
  workspaces: WorkspaceTab[];
  activeWorkspaceId: string | null;
  openWorkspace: (volt: WorkspaceTab) => void;
  closeWorkspace: (voltId: string) => void;
  setActiveWorkspace: (voltId: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  openWorkspace: (volt) => {
    const { workspaces } = get();
    const exists = workspaces.find((w) => w.voltId === volt.voltId);
    if (!exists) {
      set({ workspaces: [...workspaces, volt], activeWorkspaceId: volt.voltId });
    } else {
      set({ activeWorkspaceId: volt.voltId });
    }
  },

  closeWorkspace: (voltId) => {
    const { workspaces, activeWorkspaceId } = get();
    const filtered = workspaces.filter((w) => w.voltId !== voltId);
    let newActive = activeWorkspaceId;
    if (activeWorkspaceId === voltId) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1].voltId : null;
    }
    set({ workspaces: filtered, activeWorkspaceId: newActive });
  },

  setActiveWorkspace: (voltId) => {
    set({ activeWorkspaceId: voltId });
  },

  reorderWorkspaces: (fromIndex, toIndex) => {
    set((state) => {
      const updated = [...state.workspaces];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { workspaces: updated };
    });
  },
}));
