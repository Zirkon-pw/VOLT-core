import { create } from 'zustand';

interface ImageState {
  currentPath: string | null;
  setCurrentPath: (path: string | null) => void;
  clear: () => void;
}

export const useImageStore = create<ImageState>((set) => ({
  currentPath: null,
  setCurrentPath: (currentPath) => set({ currentPath }),
  clear: () => set({ currentPath: null }),
}));
