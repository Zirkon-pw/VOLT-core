import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchFiles } from '@api/search';
import type { SearchResult } from '@api/search';
import { usePluginRegistryStore } from '@app/plugins/pluginRegistry';
import { useI18n } from '@app/providers/I18nProvider';
import { useFileTreeStore } from '@app/stores/fileTreeStore';
import { useTabStore } from '@app/stores/tabStore';
import { Icon, type IconName } from '@uikit/icon';
import styles from './SearchPopup.module.scss';

interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  voltId: string;
  voltPath: string;
  onToggleSidebar: () => void;
}

interface CommandPaletteItem {
  id: string;
  title: string;
  hotkey?: string;
  icon: IconName;
  subtitle?: string;
  callback: () => void;
}

export function SearchPopup({
  isOpen,
  onClose,
  voltId,
  voltPath,
  onToggleSidebar,
}: SearchPopupProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTab = useTabStore((s) => s.openTab);
  const startCreate = useFileTreeStore((state) => state.startCreate);
  const pluginCommands = usePluginRegistryStore((state) => state.commands);
  const isCommandMode = query.startsWith('>');
  const commandQuery = query.slice(1).trim().toLowerCase();

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

    if (!query.trim() || isCommandMode) {
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
  }, [query, voltPath, isOpen, isCommandMode]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      openTab(voltId, result.filePath, result.fileName);
      onClose();
    },
    [voltId, openTab, onClose],
  );

  const handleCommandSelect = useCallback(
    (command: CommandPaletteItem) => {
      command.callback();
      onClose();
    },
    [onClose],
  );

  const builtInCommands = useMemo<CommandPaletteItem[]>(() => [
    {
      id: 'builtin:new-file',
      title: t('search.command.newFile'),
      hotkey: 'Mod+N',
      icon: 'plus',
      callback: () => startCreate(voltId, '', false),
    },
    {
      id: 'builtin:toggle-sidebar',
      title: t('search.command.toggleSidebar'),
      hotkey: 'Mod+B',
      icon: 'panelLeft',
      callback: onToggleSidebar,
    },
    {
      id: 'builtin:settings',
      title: t('search.command.settings'),
      icon: 'settings',
      callback: () => navigate('/settings'),
    },
  ], [navigate, onToggleSidebar, startCreate, t, voltId]);

  const commandResults = useMemo<CommandPaletteItem[]>(() => {
    if (!isCommandMode) {
      return [];
    }

    const items = [
      ...builtInCommands,
      ...pluginCommands.map((command) => ({
        id: command.id,
        title: command.name,
        hotkey: command.hotkey,
        icon: 'hash' as IconName,
        subtitle: command.pluginId,
        callback: command.callback,
      })),
    ];

    if (!commandQuery) {
      return items;
    }

    return items.filter((item) => (
      item.title.toLowerCase().includes(commandQuery) ||
      item.hotkey?.toLowerCase().includes(commandQuery) ||
      item.subtitle?.toLowerCase().includes(commandQuery)
    ));
  }, [builtInCommands, commandQuery, isCommandMode, pluginCommands]);

  useEffect(() => {
    if (isCommandMode) {
      setActiveIndex(0);
    }
  }, [commandQuery, isCommandMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const itemsCount = isCommandMode ? commandResults.length : results.length;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(itemsCount - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isCommandMode && commandResults[activeIndex]) {
          handleCommandSelect(commandResults[activeIndex]);
        } else if (!isCommandMode && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
      }
    },
    [activeIndex, commandResults, handleCommandSelect, handleSelect, isCommandMode, onClose, results],
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
    if (!query.trim() || isCommandMode) return [];
    return results;
  }, [results, query, isCommandMode]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={t(isCommandMode ? 'search.commandPlaceholder' : 'search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.results} ref={resultsRef}>
          {isCommandMode && commandResults.length === 0 && (
            <div className={styles.empty}>{t('search.commandEmpty')}</div>
          )}
          {!isCommandMode && query.trim() && highlightedResults.length === 0 && (
            <div className={styles.empty}>{t('search.empty')}</div>
          )}
          {isCommandMode && commandResults.map((command, i) => (
            <div
              key={command.id}
              className={`${styles.resultItem} ${i === activeIndex ? styles.active : ''}`}
              onClick={() => handleCommandSelect(command)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className={styles.resultIcon}>
                <Icon name={command.icon} size={14} />
              </span>
              <div className={styles.resultContent}>
                <div className={styles.resultHeader}>
                  <span className={styles.resultFileName}>{command.title}</span>
                  {command.hotkey && <span className={styles.hotkeyBadge}>{command.hotkey}</span>}
                </div>
                {command.subtitle && (
                  <span className={styles.resultPath}>{command.subtitle}</span>
                )}
              </div>
            </div>
          ))}
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
