import { create } from 'zustand';
import type { ComponentType } from 'react';

/**
 * Workspace slot registry: plugins register their UI components for named slots.
 * WorkspaceShell renders components from slots instead of importing plugins directly.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlotComponent = ComponentType<any>;

interface WorkspaceSlotRegistryState {
  slots: Record<string, SlotComponent>;
  registerSlot: (slotId: string, component: SlotComponent) => void;
  unregisterSlot: (slotId: string) => void;
}

export const useWorkspaceSlotRegistry = create<WorkspaceSlotRegistryState>((set) => ({
  slots: {},
  registerSlot: (slotId, component) =>
    set((state) => ({ slots: { ...state.slots, [slotId]: component } })),
  unregisterSlot: (slotId) =>
    set((state) => {
      const { [slotId]: _, ...rest } = state.slots;
      return { slots: rest };
    }),
}));
