import { create } from 'zustand';

/**
 * Service interface for shortcut resolution from kernel code.
 * The settings plugin registers the implementation at startup.
 */

export interface ShortcutServiceMethods {
  useResolvedShortcuts: () => {
    descriptors: unknown[];
    items: unknown[];
    byActionId: Record<string, { status: string; binding: string | null }>;
  };
  useShortcutAction: (
    actionId: string,
    handler: () => void,
    options?: { enabled?: boolean; allowInEditable?: boolean; preventDefault?: boolean },
  ) => unknown;
  BUILTIN_SHORTCUT_ACTIONS: Record<string, string>;
  getPluginCommandShortcutActionId: (commandId: string) => string;
}

interface ShortcutServiceState {
  methods: ShortcutServiceMethods | null;
  register: (methods: ShortcutServiceMethods) => void;
}

export const useShortcutService = create<ShortcutServiceState>((set) => ({
  methods: null,
  register: (methods) => set({ methods }),
}));
