import { create } from 'zustand';

interface SearchState {
  isOpen: boolean;
  query: string;
  setOpen: (isOpen: boolean) => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: '',
  setOpen: (isOpen) => set({ isOpen }),
  setQuery: (query) => set({ query }),
  reset: () => set({ isOpen: false, query: '' }),
}));
