import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BUILTIN_SHORTCUT_ACTIONS,
  getPluginCommandShortcutActionId,
  useResolvedShortcuts,
} from '@entities/app-settings';
import { useFileTreeStore } from '@entities/file-tree';
import { usePluginRegistryStore } from '@entities/plugin';
import { useTabStore } from '@entities/tab';
import { searchFiles } from '@shared/api/search';
import type { SearchResult } from '@shared/api/search';
import { formatShortcutBinding } from '@shared/lib/hotkeys';
import { useI18n } from '@app/providers/I18nProvider';
import type { IconName } from '@shared/ui/icon';

export interface CommandPaletteItem {
  id: string;
  title: string;
  hotkey?: string;
  icon: IconName;
  subtitle?: string;
  callback: () => void;
}

export function useSearchPopup(
  isOpen: boolean,
  onClose: () => void,
  voltId: string,
  voltPath: string,
  onToggleSidebar: () => void,
) {
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
  const { byActionId } = useResolvedShortcuts();
  const isCommandMode = query.startsWith('>');
  const commandQuery = query.slice(1).trim().toLowerCase();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

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
      hotkey: formatShortcutBinding(byActionId[BUILTIN_SHORTCUT_ACTIONS.fileCreate]?.binding),
      icon: 'plus',
      callback: () => startCreate(voltId, '', false),
    },
    {
      id: 'builtin:toggle-sidebar',
      title: t('search.command.toggleSidebar'),
      hotkey: formatShortcutBinding(byActionId[BUILTIN_SHORTCUT_ACTIONS.workspaceSidebarToggle]?.binding),
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
    if (!isCommandMode) return [];

    const items = [
      ...builtInCommands,
      ...pluginCommands.map((command) => ({
        id: command.id,
        title: command.name,
        hotkey: formatShortcutBinding(byActionId[getPluginCommandShortcutActionId(command.id)]?.binding),
        icon: 'hash' as IconName,
        subtitle: command.pluginId,
        callback: command.callback,
      })),
    ];

    if (!commandQuery) return items;

    return items.filter((item) => (
      item.title.toLowerCase().includes(commandQuery) ||
      item.hotkey?.toLowerCase().includes(commandQuery) ||
      item.subtitle?.toLowerCase().includes(commandQuery)
    ));
  }, [builtInCommands, byActionId, commandQuery, isCommandMode, pluginCommands]);

  useEffect(() => {
    if (isCommandMode) {
      setActiveIndex(0);
    }
  }, [commandQuery, isCommandMode]);

  const highlightedResults = useMemo(() => {
    if (!query.trim() || isCommandMode) return [];
    return results;
  }, [results, query, isCommandMode]);

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

  return {
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    resultsRef,
    isCommandMode,
    commandResults,
    highlightedResults,
    handleKeyDown,
    handleOverlayClick,
    handleSelect,
    handleCommandSelect,
    t,
  };
}
