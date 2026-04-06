import { useMemo, type MouseEvent } from 'react';
import type { SearchResult } from '@plugins/search';
import { getFileIconSource } from '@shared/lib/fileIcons';
import { Icon } from '@shared/ui/icon';
import styles from './SearchPopup.module.scss';

interface FileSearchResultsProps {
  results: SearchResult[];
  query: string;
  activeIndex: number;
  onSelect: (result: SearchResult, event?: MouseEvent<HTMLDivElement>) => void;
  onHover: (index: number) => void;
  emptyLabel: string;
}

export function FileSearchResults({
  results,
  query,
  activeIndex,
  onSelect,
  onHover,
  emptyLabel,
}: FileSearchResultsProps) {
  if (query.trim() && results.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  return (
    <>
      {results.map((result, i) => (
        <div
          key={`${result.filePath}-${result.line}`}
          className={`${styles.resultItem} ${i === activeIndex ? styles.active : ''}`}
          onClick={(event) => onSelect(result, event)}
          onMouseEnter={() => onHover(i)}
        >
          <span className={styles.resultIcon}>
            <Icon name={getFileIconSource(result.filePath, false)} size={16} />
          </span>
          <div className={styles.resultContent}>
            <span
              className={`${styles.resultFileName} ${result.isName ? styles.resultFileNameBold : ''}`}
            >
              {result.fileName}
            </span>
            <span className={styles.resultPath}>{result.filePath}</span>
            {result.snippet && (
              <SnippetText snippet={result.snippet} query={query} />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function SnippetText({ snippet, query }: { snippet: string; query: string }) {
  const parts = useMemo(() => {
    const lower = snippet.toLowerCase();
    const qLower = query.toLowerCase().trim();
    if (!qLower) {
      return [{ text: snippet, highlight: false }];
    }
    const segments: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;

    let idx = lower.indexOf(qLower, lastIndex);
    while (idx !== -1) {
      if (idx > lastIndex) {
        segments.push({ text: snippet.slice(lastIndex, idx), highlight: false });
      }
      segments.push({ text: snippet.slice(idx, idx + qLower.length), highlight: true });
      lastIndex = idx + qLower.length;
      idx = lower.indexOf(qLower, lastIndex);
    }

    if (lastIndex < snippet.length) {
      segments.push({ text: snippet.slice(lastIndex), highlight: false });
    }

    return segments;
  }, [snippet, query]);

  return (
    <span className={styles.resultSnippet}>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className={styles.highlight}>{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
