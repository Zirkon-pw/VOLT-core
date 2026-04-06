import type { SearchResult } from './model/types';
import { listTree, readFile, type FileEntry } from '@shared/api/file';

const MAX_RESULTS = 50;
const MAX_CONTENT_MATCHES_PER_FILE = 3;
const SNIPPET_CONTEXT_CHARS = 28;

function flattenFiles(entries: FileEntry[]): FileEntry[] {
  return entries.flatMap((entry) => (
    entry.isDir ? flattenFiles(entry.children ?? []) : [entry]
  ));
}

function buildSnippet(line: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_CONTEXT_CHARS);
  const end = Math.min(line.length, matchIndex + matchLength + SNIPPET_CONTEXT_CHARS);
  let snippet = line.slice(start, end);
  if (start > 0) {
    snippet = `...${snippet}`;
  }
  if (end < line.length) {
    snippet = `${snippet}...`;
  }
  return snippet;
}

function collectMatches(filePath: string, queryLower: string, content: string): SearchResult[] {
  const fileName = filePath.split(/[\\/]/).filter(Boolean).at(-1) ?? filePath;
  const results: SearchResult[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    const matchIndex = line.toLowerCase().indexOf(queryLower);
    if (matchIndex < 0) {
      continue;
    }

    results.push({
      filePath,
      fileName,
      snippet: buildSnippet(line, matchIndex, queryLower.length),
      line: lineIndex + 1,
      isName: false,
    });

    if (results.length >= MAX_CONTENT_MATCHES_PER_FILE) {
      break;
    }
  }

  return results;
}

export type { SearchResult };

export async function searchFiles(voltPath: string, query: string): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const queryLower = trimmedQuery.toLowerCase();
  const tree = await listTree(voltPath);
  const files = flattenFiles(tree);
  const nameMatches: SearchResult[] = [];
  const contentMatches: SearchResult[] = [];

  for (const entry of files) {
    if (nameMatches.length + contentMatches.length >= MAX_RESULTS) {
      break;
    }

    const fileName = entry.name || entry.path.split(/[\\/]/).filter(Boolean).at(-1) || entry.path;
    if (fileName.toLowerCase().includes(queryLower)) {
      nameMatches.push({
        filePath: entry.path,
        fileName,
        snippet: '',
        line: 0,
        isName: true,
      });
    }

    if (nameMatches.length + contentMatches.length >= MAX_RESULTS) {
      break;
    }

    try {
      const content = await readFile(voltPath, entry.path);
      contentMatches.push(...collectMatches(entry.path, queryLower, content));
    } catch {
      // Ignore unreadable or binary files in the compatibility search path.
    }
  }

  return [...nameMatches, ...contentMatches].slice(0, MAX_RESULTS);
}
