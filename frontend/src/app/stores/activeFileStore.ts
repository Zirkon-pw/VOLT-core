import { create } from 'zustand';
import { useTabStore } from './tabStore';

type SaveHandler = () => Promise<void>;

interface ActiveFileState {
  saveHandlers: Record<string, SaveHandler>;
  registerSaveHandler: (voltId: string, filePath: string, handler: SaveHandler) => () => void;
  saveActiveFile: (voltId: string) => Promise<boolean>;
}

function getHandlerKey(voltId: string, filePath: string): string {
  return `${voltId}:${filePath}`;
}

export const useActiveFileStore = create<ActiveFileState>((set, get) => ({
  saveHandlers: {},

  registerSaveHandler: (voltId, filePath, handler) => {
    const key = getHandlerKey(voltId, filePath);

    set((state) => ({
      saveHandlers: {
        ...state.saveHandlers,
        [key]: handler,
      },
    }));

    return () => {
      set((state) => {
        if (state.saveHandlers[key] !== handler) {
          return state;
        }

        const nextHandlers = { ...state.saveHandlers };
        delete nextHandlers[key];
        return { saveHandlers: nextHandlers };
      });
    };
  },

  saveActiveFile: async (voltId) => {
    const tabState = useTabStore.getState();
    const activeTabId = tabState.activeTabs[voltId] ?? null;
    if (!activeTabId) {
      return false;
    }

    const activeTab = (tabState.tabs[voltId] ?? []).find((tab) => tab.id === activeTabId) ?? null;
    if (!activeTab || activeTab.type !== 'file') {
      return false;
    }

    const handler = get().saveHandlers[getHandlerKey(voltId, activeTab.filePath)];
    if (!handler) {
      return false;
    }

    await handler();
    return true;
  },
}));
