import { create } from 'zustand';
import type { FileTab } from '@kernel/workspace/tabs/model';

export type PaneId = 'primary' | 'secondary';

export interface WorkspaceViewState {
  primaryTabId: string | null;
  secondaryTabId: string | null;
  activePane: PaneId;
  splitRatio: number;
}

interface WorkspaceViewStoreState {
  views: Record<string, WorkspaceViewState>;
  syncTabs: (voltId: string, tabs: FileTab[], activeTabId: string | null) => void;
  openInPrimary: (voltId: string, tabId: string) => void;
  openInSecondary: (voltId: string, tabId: string) => void;
  setActivePane: (voltId: string, paneId: PaneId) => void;
  setSplitRatio: (voltId: string, ratio: number) => void;
  closeSecondary: (voltId: string) => void;
}

const DEFAULT_SPLIT_RATIO = 0.5;
const MIN_SPLIT_RATIO = 0.34;
const MAX_SPLIT_RATIO = 0.66;

function clampSplitRatio(value: number): number {
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

function createDefaultView(activeTabId: string | null, tabs: FileTab[]): WorkspaceViewState {
  return {
    primaryTabId: activeTabId ?? tabs[0]?.id ?? null,
    secondaryTabId: null,
    activePane: 'primary',
    splitRatio: DEFAULT_SPLIT_RATIO,
  };
}

function buildNextView(
  prev: WorkspaceViewState | undefined,
  tabs: FileTab[],
  activeTabId: string | null,
): WorkspaceViewState {
  const fallback = createDefaultView(activeTabId, tabs);
  if (tabs.length === 0) {
    return fallback;
  }

  const existingIds = new Set(tabs.map((tab) => tab.id));
  const next: WorkspaceViewState = {
    primaryTabId: prev?.primaryTabId && existingIds.has(prev.primaryTabId) ? prev.primaryTabId : null,
    secondaryTabId:
      prev?.secondaryTabId && existingIds.has(prev.secondaryTabId) ? prev.secondaryTabId : null,
    activePane: prev?.activePane ?? 'primary',
    splitRatio: clampSplitRatio(prev?.splitRatio ?? DEFAULT_SPLIT_RATIO),
  };

  if (!next.primaryTabId) {
    next.primaryTabId = activeTabId && existingIds.has(activeTabId)
      ? activeTabId
      : tabs[0]?.id ?? null;
  }

  if (next.secondaryTabId === next.primaryTabId) {
    next.secondaryTabId = null;
  }

  if (activeTabId && existingIds.has(activeTabId)) {
    if (activeTabId === next.primaryTabId) {
      next.activePane = 'primary';
    } else if (activeTabId === next.secondaryTabId) {
      next.activePane = 'secondary';
    } else if (next.activePane === 'secondary' && next.primaryTabId !== activeTabId) {
      next.secondaryTabId = activeTabId;
    } else {
      next.primaryTabId = activeTabId;
    }
  }

  if (!next.primaryTabId && next.secondaryTabId) {
    next.primaryTabId = next.secondaryTabId;
    next.secondaryTabId = null;
  }

  if (next.secondaryTabId === next.primaryTabId) {
    next.secondaryTabId = null;
  }

  if (next.activePane === 'secondary' && !next.secondaryTabId) {
    next.activePane = 'primary';
  }

  return next;
}

function isSameView(a: WorkspaceViewState | undefined, b: WorkspaceViewState): boolean {
  return (
    a?.primaryTabId === b.primaryTabId
    && a?.secondaryTabId === b.secondaryTabId
    && a?.activePane === b.activePane
    && a?.splitRatio === b.splitRatio
  );
}

export const useWorkspaceViewStore = create<WorkspaceViewStoreState>((set) => ({
  views: {},

  syncTabs: (voltId, tabs, activeTabId) => {
    set((state) => {
      const prev = state.views[voltId];
      const next = buildNextView(prev, tabs, activeTabId);
      if (isSameView(prev, next)) {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: next,
        },
      };
    });
  },

  openInPrimary: (voltId, tabId) => {
    set((state) => {
      const prev = state.views[voltId] ?? createDefaultView(tabId, []);
      const secondaryTabId = prev.secondaryTabId === tabId ? null : prev.secondaryTabId;
      const next: WorkspaceViewState = {
        ...prev,
        primaryTabId: tabId,
        secondaryTabId,
        activePane: 'primary',
      };

      if (isSameView(state.views[voltId], next)) {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: next,
        },
      };
    });
  },

  openInSecondary: (voltId, tabId) => {
    set((state) => {
      const prev = state.views[voltId] ?? createDefaultView(null, []);
      if (prev.primaryTabId === tabId) {
        const next: WorkspaceViewState = {
          ...prev,
          activePane: 'primary',
        };
        if (isSameView(state.views[voltId], next)) {
          return state;
        }

        return {
          views: {
            ...state.views,
            [voltId]: next,
          },
        };
      }

      const next: WorkspaceViewState = {
        ...prev,
        secondaryTabId: tabId,
        activePane: 'secondary',
      };
      if (isSameView(state.views[voltId], next)) {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: next,
        },
      };
    });
  },

  setActivePane: (voltId, paneId) => {
    set((state) => {
      const prev = state.views[voltId];
      if (!prev) {
        return state;
      }

      if (paneId === 'secondary' && !prev.secondaryTabId) {
        return state;
      }

      if (prev.activePane === paneId) {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: {
            ...prev,
            activePane: paneId,
          },
        },
      };
    });
  },

  setSplitRatio: (voltId, ratio) => {
    set((state) => {
      const prev = state.views[voltId];
      if (!prev) {
        return state;
      }

      const nextRatio = clampSplitRatio(ratio);
      if (prev.splitRatio === nextRatio) {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: {
            ...prev,
            splitRatio: nextRatio,
          },
        },
      };
    });
  },

  closeSecondary: (voltId) => {
    set((state) => {
      const prev = state.views[voltId];
      if (!prev || !prev.secondaryTabId) {
        return state;
      }

      if (prev.secondaryTabId == null && prev.activePane === 'primary') {
        return state;
      }

      return {
        views: {
          ...state.views,
          [voltId]: {
            ...prev,
            secondaryTabId: null,
            activePane: 'primary',
          },
        },
      };
    });
  },
}));
