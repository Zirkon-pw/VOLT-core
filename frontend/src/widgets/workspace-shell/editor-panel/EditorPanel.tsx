import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { useAppSettingsStore } from '@entities/app-settings';
import { useActiveFileStore } from '@entities/editor-session';
import { useFileTreeStore } from '@entities/file-tree';
import { useTabStore } from '@entities/tab';
import { readFile } from '@shared/api/file';
import { useI18n } from '@app/providers/I18nProvider';
import { emit, setEditor } from '@shared/lib/plugin-runtime';
import { Icon } from '@shared/ui/icon';
import { useEditorSetup } from './hooks/useEditorSetup';
import { useAutoSave } from './hooks/useAutoSave';
import { useImageResolver } from './hooks/useImageResolver';
import { useImageHandlers } from './hooks/useImageHandlers';
import { MarkdownEditorSurface } from './MarkdownEditorSurface';
import { findInFileHighlightsPluginKey, type FindInFileMatch } from './extensions/FindInFileHighlights';
import { LinkFilePicker } from './extensions/LinkFilePicker';
import styles from './EditorPanel.module.scss';

interface EditorPanelProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

function getEditorSelectionText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, ' ').trim();
}

function findMatchesInEditor(editor: Editor, query: string): FindInFileMatch[] {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches: FindInFileMatch[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const normalizedText = node.text.toLowerCase();
    let searchIndex = 0;

    while (searchIndex < normalizedText.length) {
      const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex);
      if (matchIndex === -1) {
        break;
      }

      matches.push({
        from: pos + matchIndex,
        to: pos + matchIndex + trimmedQuery.length,
      });
      searchIndex = matchIndex + Math.max(normalizedQuery.length, 1);
    }
  });

  return matches;
}

function updateFindHighlights(editor: Editor, matches: FindInFileMatch[], currentIndex: number) {
  editor.view.dispatch(editor.state.tr.setMeta(findInFileHighlightsPluginKey, {
    matches,
    currentIndex,
  }));
}

function revealMatch(editor: Editor, match: FindInFileMatch | null) {
  if (!match) {
    return;
  }

  const selection = TextSelection.create(editor.state.doc, match.from, match.to);
  editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
}

export function EditorPanel({ voltId, voltPath, filePath }: EditorPanelProps) {
  const { t } = useI18n();
  const imageDir = useAppSettingsStore((state) => state.settings.imageDir);
  const editor = useEditorSetup({ placeholder: t('editor.placeholder') });
  const loadedPathRef = useRef<string | null>(null);
  const { resolve, register, unresolveAll, resolveAll, clear } = useImageResolver(voltPath);
  const notifyFsMutation = useFileTreeStore((state) => state.notifyFsMutation);
  const registerSaveHandler = useActiveFileStore((state) => state.registerSaveHandler);
  const pendingRename = useTabStore((state) => state.pendingRenames[voltId] ?? null);
  const consumePendingRename = useTabStore((state) => state.consumePendingRename);
  const activeFileTab = useTabStore((state) => {
    if (!filePath) return null;
    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((tab) => tab.id === filePath) ?? null;
  });

  const { save } = useAutoSave({ editor, voltId, voltPath, filePath, transformMarkdown: unresolveAll });
  const { handleDrop, handleDragOver, handlePaste } = useImageHandlers({
    editor, voltId, voltPath, filePath, imageDir, resolve, register, notifyFsMutation,
  });

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showFindInFile, setShowFindInFile] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatches, setFindMatches] = useState<FindInFileMatch[]>([]);
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const findQueryRef = useRef('');
  const activeFindMatchRef = useRef<FindInFileMatch | null>(null);
  const closeLinkPicker = useCallback(() => setShowLinkPicker(false), []);

  const closeFindInFile = useCallback(() => {
    setShowFindInFile(false);
    setFindQuery('');
    setFindMatches([]);
    setActiveFindIndex(0);

    if (editor) {
      updateFindHighlights(editor, [], 0);
    }
  }, [editor]);

  const syncFindMatches = useCallback((nextQuery: string, preferredMatch: FindInFileMatch | null = null) => {
    if (!editor) {
      return;
    }

    const matches = findMatchesInEditor(editor, nextQuery);
    const nextIndex = preferredMatch == null
      ? 0
      : Math.max(matches.findIndex((match) => (
        match.from === preferredMatch.from && match.to === preferredMatch.to
      )), 0);

    setFindMatches(matches);
    setActiveFindIndex(matches.length === 0 ? 0 : nextIndex);
  }, [editor]);

  const moveFindMatch = useCallback((delta: number) => {
    if (findMatches.length === 0) {
      return;
    }

    setActiveFindIndex((current) => {
      const nextIndex = (current + delta + findMatches.length) % findMatches.length;
      return nextIndex;
    });
  }, [findMatches.length]);

  const openFindInFile = useCallback(() => {
    if (!editor) {
      return;
    }

    const selectedText = getEditorSelectionText(editor);
    const nextQuery = selectedText || findQueryRef.current;

    setShowFindInFile(true);
    if (nextQuery !== findQueryRef.current) {
      setFindQuery(nextQuery);
      return;
    }

    syncFindMatches(nextQuery, null);
  }, [editor, syncFindMatches]);

  const handleFindKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      moveFindMatch(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeFindInFile();
    }
  }, [closeFindInFile, moveFindMatch]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => setShowLinkPicker(true);
    window.addEventListener('volt:pick-link', handler);
    return () => window.removeEventListener('volt:pick-link', handler);
  }, [editor]);

  useEffect(() => {
    findQueryRef.current = findQuery;
    activeFindMatchRef.current = findMatches[activeFindIndex] ?? null;
  }, [activeFindIndex, findMatches, findQuery]);

  useEffect(() => {
    if (!editor) return;

    const handler = () => openFindInFile();
    window.addEventListener('volt:find-in-file', handler);
    return () => window.removeEventListener('volt:find-in-file', handler);
  }, [editor, openFindInFile]);

  useEffect(() => {
    if (!showFindInFile) {
      return;
    }

    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 0);
  }, [showFindInFile]);

  // Register editor with plugin bridge
  useEffect(() => {
    if (editor) {
      setEditor(editor, { voltId, voltPath, filePath });
    } else {
      setEditor(null);
    }
    return () => { setEditor(null); };
  }, [editor, filePath, voltId, voltPath]);

  useEffect(() => {
    if (filePath) return;
    loadedPathRef.current = null;
    clear();
    setShowFindInFile(false);
    setFindQuery('');
    setFindMatches([]);
    setActiveFindIndex(0);
  }, [clear, filePath]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (!showFindInFile) {
      updateFindHighlights(editor, [], 0);
      return;
    }

    syncFindMatches(findQuery, null);

    const handleEditorUpdate = () => {
      syncFindMatches(findQueryRef.current, activeFindMatchRef.current);
    };

    editor.on('update', handleEditorUpdate);
    return () => {
      editor.off('update', handleEditorUpdate);
    };
  }, [editor, findQuery, showFindInFile, syncFindMatches]);

  useEffect(() => {
    if (!editor || !showFindInFile || !findQuery.trim() || findMatches.length === 0) {
      if (editor) {
        updateFindHighlights(editor, [], 0);
      }
      return;
    }

    updateFindHighlights(editor, findMatches, activeFindIndex);
    revealMatch(editor, findMatches[activeFindIndex] ?? null);
  }, [activeFindIndex, editor, findMatches, findQuery, showFindInFile]);

  // Load file content
  useEffect(() => {
    if (!editor || !filePath) return;
    if (loadedPathRef.current === filePath) return;

    let cancelled = false;

    (async () => {
      try {
        const isRenameTransition = pendingRename?.newPath === filePath && loadedPathRef.current === pendingRename.oldPath;
        if (isRenameTransition) {
          if (activeFileTab?.isDirty) {
            await save();
          }
          loadedPathRef.current = filePath;
          consumePendingRename(voltId, filePath);
          return;
        }

        clear();
        const raw = await readFile(voltPath, filePath);
        if (cancelled) return;
        const content = await resolveAll(raw);
        if (cancelled) return;
        editor.commands.setContent(content);
        editor.commands.setTextSelection(1);
        loadedPathRef.current = filePath;
        emit('file-open', filePath);
      } catch (e) {
        console.error('Failed to load note:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [clear, consumePendingRename, editor, filePath, pendingRename, resolveAll, save, voltId, voltPath]);

  useEffect(() => {
    if (!filePath) return;
    return registerSaveHandler(voltId, filePath, save);
  }, [filePath, registerSaveHandler, save, voltId]);

  useEffect(() => {
    closeFindInFile();
  }, [closeFindInFile, filePath]);

  const findCountLabel = !findQuery.trim()
    ? ''
    : findMatches.length > 0
      ? t('editor.findInFile.count', {
        current: activeFindIndex + 1,
        total: findMatches.length,
      })
      : t('editor.findInFile.noMatches');

  if (!filePath) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>{t('editor.empty')}</span>
      </div>
    );
  }

  return (
    <>
      <div className={styles.editorPanel}>
        <MarkdownEditorSurface
          editor={editor}
          voltId={voltId}
          voltPath={voltPath}
          filePath={filePath}
          showTaskStatusBanner
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
        />
        {showFindInFile && (
          <div className={styles.findPanel} data-testid="find-in-file-panel">
            <div className={styles.findInputWrap}>
              <Icon name="search" size={14} />
              <input
                ref={findInputRef}
                data-testid="find-in-file-input"
                className={styles.findInput}
                type="text"
                value={findQuery}
                placeholder={t('editor.findInFile.placeholder')}
                onChange={(event) => setFindQuery(event.target.value)}
                onKeyDown={handleFindKeyDown}
              />
            </div>
            <div className={styles.findActions}>
              <span className={styles.findCount} data-testid="find-in-file-count">
                {findCountLabel}
              </span>
              <button
                type="button"
                className={styles.findButton}
                onClick={() => moveFindMatch(-1)}
                disabled={findMatches.length === 0}
                title={t('editor.findInFile.previous')}
              >
                Shift+Enter
              </button>
              <button
                type="button"
                className={styles.findButton}
                onClick={() => moveFindMatch(1)}
                disabled={findMatches.length === 0}
                title={t('editor.findInFile.next')}
              >
                Enter
              </button>
              <button
                type="button"
                className={styles.findIconButton}
                onClick={closeFindInFile}
                title={t('common.close')}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      {showLinkPicker && editor && (
        <LinkFilePicker
          editor={editor}
          voltId={voltId}
          filePath={filePath}
          onClose={closeLinkPicker}
        />
      )}
    </>
  );
}
