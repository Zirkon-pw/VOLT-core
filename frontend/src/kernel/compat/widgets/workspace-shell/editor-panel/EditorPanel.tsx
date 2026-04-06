import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { flushSync } from 'react-dom';
import { useActiveFileStore } from '@entities/editor-session';
import { useFileTreeStore } from '@plugins/file-tree';
import { useAppSettingsStore } from '@plugins/settings/SettingsStore';
import { useTabStore } from '@entities/tab';
import { readFile } from '@shared/api/file';
import { useI18n } from '@app/providers/I18nProvider';
import { emit, setEditor } from '@shared/lib/plugin-runtime';
import { Icon } from '@shared/ui/icon';
import { resetEditorHistory, useEditorSetup } from './hooks/useEditorSetup';
import { useAutoSave } from './hooks/useAutoSave';
import { useImageResolver } from './hooks/useImageResolver';
import { useImageHandlers } from './hooks/useImageHandlers';
import { MarkdownEditorSurface } from './MarkdownEditorSurface';
import { findInFileHighlightsPluginKey, type FindInFileMatch } from './extensions/FindInFileHighlights';
import { LinkFilePicker } from './extensions/LinkFilePicker';
import { EmbedUrlPicker } from './extensions/EmbedUrlPicker';
import { TableOfContents } from './extensions/TableOfContents';
import { preprocessMarkdown } from './lib/markdownPreprocessor';
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

function revealMatch(
  editor: Editor,
  match: FindInFileMatch | null,
  scrollContainer: HTMLDivElement | null,
) {
  if (!match) {
    return;
  }

  const selection = TextSelection.create(editor.state.doc, match.from, match.to);
  if (!scrollContainer) {
    editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
    return;
  }

  editor.view.dispatch(editor.state.tr.setSelection(selection));

  requestAnimationFrame(() => {
    if (!scrollContainer.isConnected) {
      return;
    }

    try {
      const start = editor.view.coordsAtPos(match.from);
      const end = editor.view.coordsAtPos(match.to);
      const containerRect = scrollContainer.getBoundingClientRect();
      const top = Math.min(start.top, end.top) - containerRect.top + scrollContainer.scrollTop;
      const bottom = Math.max(start.bottom, end.bottom) - containerRect.top + scrollContainer.scrollTop;
      const matchCenter = (top + bottom) / 2;
      const nextScrollTop = matchCenter - (scrollContainer.clientHeight / 2);
      const maxScrollTop = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0);
      const clampedScrollTop = Math.min(Math.max(nextScrollTop, 0), maxScrollTop);

      scrollContainer.scrollTo({
        top: clampedScrollTop,
        behavior: 'smooth',
      });
    } catch {
      editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
    }
  });
}

export function EditorPanel({ voltId, voltPath, filePath }: EditorPanelProps) {
  const { t } = useI18n();
  const imageDir = useAppSettingsStore((state) => state.settings.imageDir);
  const editor = useEditorSetup({ placeholder: t('editor.placeholder') });
  const [editorScrollContainer, setEditorScrollContainer] = useState<HTMLDivElement | null>(null);
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

  const { save, markPersisted, withTrackingSuppressed } = useAutoSave({
    editor,
    voltId,
    voltPath,
    filePath,
    transformMarkdown: unresolveAll,
  });
  const { handleDrop, handleDragOver, handlePaste } = useImageHandlers({
    editor, voltId, voltPath, filePath, imageDir, resolve, register, notifyFsMutation,
  });

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showEmbedPicker, setShowEmbedPicker] = useState(false);
  const [showFindInFile, setShowFindInFile] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatches, setFindMatches] = useState<FindInFileMatch[]>([]);
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const findQueryRef = useRef('');
  const activeFindMatchRef = useRef<FindInFileMatch | null>(null);
  const linkPickerSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const embedPickerSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const restoreSelection = useCallback((selection: { from: number; to: number } | null) => {
    if (!editor) {
      return;
    }

    try {
      editor.view.focus();

      if (selection) {
        editor.chain().focus().setTextSelection(selection).run();
        return;
      }

      editor.chain().focus().run();
    } catch {
      editor.chain().focus().run();
    }
  }, [editor]);
  const restoreLinkSelection = useCallback(() => {
    restoreSelection(linkPickerSelectionRef.current);
  }, [restoreSelection]);
  const restoreEmbedSelection = useCallback(() => {
    restoreSelection(embedPickerSelectionRef.current);
  }, [restoreSelection]);
  const closeLinkPicker = useCallback((restoreSelection = true) => {
    flushSync(() => {
      setShowLinkPicker(false);
    });

    if (restoreSelection) {
      restoreLinkSelection();
    }
  }, [restoreLinkSelection]);
  const closeEmbedPicker = useCallback((restoreSelectionOnClose = true) => {
    flushSync(() => {
      setShowEmbedPicker(false);
    });

    if (restoreSelectionOnClose) {
      restoreEmbedSelection();
    }
  }, [restoreEmbedSelection]);
  const insertEmbedBlock = useCallback((url: string) => {
    if (!editor) {
      return;
    }

    const selection = embedPickerSelectionRef.current ?? {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .insertContent({ type: 'embedBlock', attrs: { url } })
      .run();

    closeEmbedPicker(false);
  }, [closeEmbedPicker, editor]);

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

    const handler = () => {
      linkPickerSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      setShowLinkPicker(true);
    };

    window.addEventListener('volt:pick-link', handler);
    return () => window.removeEventListener('volt:pick-link', handler);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      embedPickerSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      setShowEmbedPicker(true);
    };

    window.addEventListener('volt:pick-embed', handler);
    return () => window.removeEventListener('volt:pick-embed', handler);
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
    linkPickerSelectionRef.current = null;
    embedPickerSelectionRef.current = null;
    setShowEmbedPicker(false);
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
    revealMatch(editor, findMatches[activeFindIndex] ?? null, editorScrollContainer);
  }, [activeFindIndex, editor, editorScrollContainer, findMatches, findQuery, showFindInFile]);

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
        const preprocessed = preprocessMarkdown(raw);
        const content = await resolveAll(preprocessed);
        if (cancelled) return;
        withTrackingSuppressed(() => {
          editor.commands.setContent(content);
          editor.commands.setTextSelection(1);
          resetEditorHistory(editor);
        });
        requestAnimationFrame(() => {
          editor.commands.focus();
        });
        markPersisted(raw);
        loadedPathRef.current = filePath;
        emit('file-open', filePath);
      } catch (e) {
        console.error('Failed to load note:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [
    clear,
    consumePendingRename,
    editor,
    filePath,
    markPersisted,
    pendingRename,
    resolveAll,
    save,
    voltId,
    voltPath,
    withTrackingSuppressed,
  ]);

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
          onScrollContainerChange={setEditorScrollContainer}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
        />
        {editor && <TableOfContents editor={editor} scrollContainer={editorScrollContainer} />}
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
          selection={linkPickerSelectionRef.current ?? {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }}
          onClose={closeLinkPicker}
        />
      )}
      <EmbedUrlPicker
        isOpen={showEmbedPicker}
        onClose={closeEmbedPicker}
        onSubmit={insertEmbedBlock}
      />
    </>
  );
}
