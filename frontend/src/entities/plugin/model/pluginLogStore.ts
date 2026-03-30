import { create } from 'zustand';

export interface PluginLogEntry {
  id: number;
  pluginId: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

interface PluginLogState {
  entries: PluginLogEntry[];
  addEntry: (pluginId: string, level: PluginLogEntry['level'], message: string) => void;
  clearByPlugin: (pluginId: string) => void;
  clearAll: () => void;
}

let nextId = 1;
const MAX_ENTRIES = 500;

export const usePluginLogStore = create<PluginLogState>((set) => ({
  entries: [],
  addEntry: (pluginId, level, message) =>
    set((s) => {
      const entry: PluginLogEntry = {
        id: nextId++,
        pluginId,
        level,
        message,
        timestamp: Date.now(),
      };
      const next = [...s.entries, entry];
      return { entries: next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next };
    }),
  clearByPlugin: (pluginId) =>
    set((s) => ({ entries: s.entries.filter((e) => e.pluginId !== pluginId) })),
  clearAll: () => set({ entries: [] }),
}));
