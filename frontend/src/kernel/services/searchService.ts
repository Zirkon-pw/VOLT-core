import { create } from 'zustand';

/**
 * Service interface for search operations from kernel code.
 * The search plugin registers its implementation at startup.
 */

export interface SearchResult {
  filePath: string;
  fileName: string;
  snippet: string;
  line: number;
  isName: boolean;
}

export interface SearchServiceMethods {
  searchFiles: (voltPath: string, query: string) => Promise<SearchResult[]>;
}

interface SearchServiceState {
  methods: SearchServiceMethods | null;
  register: (methods: SearchServiceMethods) => void;
}

export const useSearchService = create<SearchServiceState>((set) => ({
  methods: null,
  register: (methods) => set({ methods }),
}));

export function searchFiles(voltPath: string, query: string): Promise<SearchResult[]> {
  const m = useSearchService.getState().methods;
  if (!m) throw new Error('SearchService not registered');
  return m.searchFiles(voltPath, query);
}
