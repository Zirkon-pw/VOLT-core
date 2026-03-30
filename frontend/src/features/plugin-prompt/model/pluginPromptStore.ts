import { create } from 'zustand';

export interface PluginPromptRequest {
  title: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  multiline?: boolean;
}

interface PluginPromptState {
  request: PluginPromptRequest | null;
  setRequest: (request: PluginPromptRequest | null) => void;
}

let pendingResolve: ((value: string | null) => void) | null = null;

export const usePluginPromptStore = create<PluginPromptState>((set) => ({
  request: null,
  setRequest: (request) => set({ request }),
}));

export function openPluginPrompt(request: PluginPromptRequest): Promise<string | null> {
  if (pendingResolve) {
    pendingResolve(null);
  }

  usePluginPromptStore.getState().setRequest(request);

  return new Promise<string | null>((resolve) => {
    pendingResolve = resolve;
  });
}

export function resolvePluginPrompt(value: string | null): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  usePluginPromptStore.getState().setRequest(null);
  resolve?.(value);
}
