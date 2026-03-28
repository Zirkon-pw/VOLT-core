import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchFiles } from '@api/search';
import type { SearchResult } from '@api/search';
import { useI18n } from '@app/providers/I18nProvider';
import { useTabStore } from '@app/stores/tabStore';
import { Icon } from '@uikit/icon';
import styles from './SearchPopup.module.scss';

interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  voltId: string;
  voltPath: string;
}

export function SearchPopup({ isOpen, onClose, voltId, voltPath }: SearchPopupProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTab = useTabStore((s) => s.openTab);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      // Auto-focus input on next tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchFiles(voltPath, query.trim());
        setResults(data ?? []);
        setActiveIndex(0);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, voltPath, isOpen]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      openTab(voltId, result.filePath, result.fileName);
      onClose();
    },
    [voltId, openTab, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
      }
    },
    [results, activeIndex, handleSelect, onClose],
  );

  // Scroll active item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const activeEl = container.children[activeIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const highlightedResults = useMemo(() => {
    if (!query.trim()) return [];
    return results;
  }, [results, query]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.results} ref={resultsRef}>
          {query.trim() && highlightedResults.length === 0 && (
            <div className={styles.empty}>{t('search.empty')}</div>
          )}
          {highlightedResults.map((result, i) => (
            <div
              key={`${result.filePath}-${result.line}`}
              className={`${styles.resultItem} ${i === activeIndex ? styles.active : ''}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className={styles.resultIcon}>
                {result.isName ? <Icon name="hash" size={14} /> : <Icon name="fileText" size={14} />}
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
        </div>
      </div>
    </div>
  );
}

function SnippetText({ snippet, query }: { snippet: string; query: string }) {
  const parts = useMemo(() => {
    const lower = snippet.toLowerCase();
    const qLower = query.toLowerCase().trim();
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
          <span key={i} className={styles.highlight}>
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
