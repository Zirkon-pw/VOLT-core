import { create } from 'zustand';
import { Volt } from '@shared/api/volt/types';
import * as voltApi from '@shared/api/volt/voltApi';

interface VoltState {
  volts: Volt[];
  loading: boolean;
  error: string | null;
  fetchVolts: () => Promise<void>;
  createVolt: (name: string, path: string) => Promise<Volt | null>;
  deleteVolt: (id: string) => Promise<void>;
}

export const useVoltStore = create<VoltState>((set, get) => ({
  volts: [],
  loading: false,
  error: null,
  fetchVolts: async () => {
    set({ loading: true, error: null });
    try {
      const volts = await voltApi.listVolts();
      set({ volts, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  createVolt: async (name, path) => {
    try {
      const volt = await voltApi.createVolt(name, path);
      set({ volts: [...get().volts, volt] });
      return volt;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },
  deleteVolt: async (id) => {
    try {
      await voltApi.deleteVolt(id);
      set({ volts: get().volts.filter((v) => v.id !== id) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
