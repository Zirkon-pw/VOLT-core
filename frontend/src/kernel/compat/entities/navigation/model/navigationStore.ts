import { create } from 'zustand';

interface NavigationState {
  history: Record<string, string[]>;
  currentIndex: Record<string, number>;
  push: (voltId: string, filePath: string) => void;
  goBack: (voltId: string) => string | null;
  goForward: (voltId: string) => string | null;
  canGoBack: (voltId: string) => boolean;
  canGoForward: (voltId: string) => boolean;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  history: {},
  currentIndex: {},

  push: (voltId, filePath) => {
    set((state) => {
      const stack = state.history[voltId] ?? [];
      const idx = state.currentIndex[voltId] ?? -1;

      if (stack[idx] === filePath) return state;

      const trimmed = stack.slice(0, idx + 1);
      trimmed.push(filePath);

      return {
        history: { ...state.history, [voltId]: trimmed },
        currentIndex: { ...state.currentIndex, [voltId]: trimmed.length - 1 },
      };
    });
  },

  goBack: (voltId) => {
    const state = get();
    const idx = state.currentIndex[voltId] ?? -1;
    if (idx <= 0) return null;

    const newIdx = idx - 1;
    const target = state.history[voltId]![newIdx]!;
    set((s) => ({
      currentIndex: { ...s.currentIndex, [voltId]: newIdx },
    }));
    return target;
  },

  goForward: (voltId) => {
    const state = get();
    const stack = state.history[voltId] ?? [];
    const idx = state.currentIndex[voltId] ?? -1;
    if (idx >= stack.length - 1) return null;

    const newIdx = idx + 1;
    const target = stack[newIdx]!;
    set((s) => ({
      currentIndex: { ...s.currentIndex, [voltId]: newIdx },
    }));
    return target;
  },

  canGoBack: (voltId) => {
    const state = get();
    return (state.currentIndex[voltId] ?? -1) > 0;
  },

  canGoForward: (voltId) => {
    const state = get();
    const stack = state.history[voltId] ?? [];
    const idx = state.currentIndex[voltId] ?? -1;
    return idx < stack.length - 1;
  },
}));
