import { create } from 'zustand';
import type { Volt } from './types';
import * as vaultManager from '@plugins/vault-manager/VaultManager';

interface VoltState {
  volts: Volt[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  fetchVolts: () => Promise<void>;
  createVolt: (name: string, path: string) => Promise<Volt>;
  createVoltInParent: (name: string, parentPath: string, directoryName: string) => Promise<Volt>;
  deleteVolt: (id: string) => Promise<void>;
}

export const useVoltStore = create<VoltState>((set, get) => ({
  volts: [],
  loading: false,
  error: null,
  clearError: () => set({ error: null }),
  fetchVolts: async () => {
    set({ loading: true, error: null });
    try {
      const volts = await vaultManager.listVolts();
      set({ volts, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  createVolt: async (name, path) => {
    try {
      const volt = await vaultManager.createVolt(name, path);
      set({ volts: [...get().volts, volt], error: null });
      return volt;
    } catch (e) {
      const error = (e as Error).message;
      set({ error });
      throw e;
    }
  },
  createVoltInParent: async (name, parentPath, directoryName) => {
    try {
      const volt = await vaultManager.createVoltInParent(name, parentPath, directoryName);
      set({ volts: [...get().volts, volt], error: null });
      return volt;
    } catch (e) {
      const error = (e as Error).message;
      set({ error });
      throw e;
    }
  },
  deleteVolt: async (id) => {
    try {
      await vaultManager.deleteVolt(id);
      set({ volts: get().volts.filter((v) => v.id !== id) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
