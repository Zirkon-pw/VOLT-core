import type { SearchResult } from './types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';

const loadSearchHandler = () => import('../../../../wailsjs/go/wailshandler/SearchHandler');

export async function searchFiles(voltPath: string, query: string): Promise<SearchResult[]> {
  return invokeWailsSafe(loadSearchHandler, (mod) => mod.SearchFiles(voltPath, query), 'searchFiles');
}
