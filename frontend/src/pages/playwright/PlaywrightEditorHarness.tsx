import { useCallback, useEffect, useState } from 'react';
import { SearchPopup } from '@features/workspace-search';
import type { FileEntry } from '@shared/api/file/types';
import { getEditor } from '@shared/lib/plugin-runtime';
import { FileTree } from '@widgets/workspace-shell/file-tree/FileTree';
import { EditorPanel } from '@widgets/workspace-shell/editor-panel/EditorPanel';
import { FileTabs } from '@widgets/workspace-shell/file-tabs/FileTabs';
import { Breadcrumbs } from '@widgets/workspace-shell/breadcrumbs/Breadcrumbs';
import { useFileTreeStore } from '@entities/file-tree';
import { useTabStore } from '@entities/tab';
import { useWorkspaceHotkeys } from '@widgets/workspace-shell/model/useWorkspaceHotkeys';

declare global {
  interface Window {
    runtime?: {
      BrowserOpenURL?: (url: string) => void;
    };
    __VOLT_PLAYWRIGHT__?: {
      getActiveTab: () => string | null;
      getOpenedUrl: () => string | null;
      getSavedFile: (path: string) => string | null;
      getMarkdown: () => string | null;
      getSelectionRange: () => { from: number; to: number } | null;
      insertMathBlock: () => void;
      insertMathInline: () => void;
      insertCodeBlock: () => void;
      reset: () => void;
    };
  }
}

const VOLT_ID = 'playwright-volt';
const VOLT_PATH = '/playwright/volt';
const FILE_PATH = 'notes/test.md';

const INITIAL_FILE_TREE: FileEntry[] = [
  {
    name: 'notes',
    path: 'notes',
    isDir: true,
    children: [
      { name: 'test.md', path: 'notes/test.md', isDir: false },
      { name: 'target.md', path: 'notes/target.md', isDir: false },
    ],
  },
  {
    name: 'docs',
    path: 'docs',
    isDir: true,
    children: [
      { name: 'guide.md', path: 'docs/guide.md', isDir: false },
    ],
  },
  {
    name: 'files',
    path: 'files',
    isDir: true,
    children: [
      { name: 'spec.pdf', path: 'files/spec.pdf', isDir: false },
    ],
  },
];

const INITIAL_MARKDOWN = `# Playwright harness

Alpha paragraph

Beta paragraph

[External](https://example.com)

[Internal](../docs/guide.md)

[File](../files/spec.pdf)

| Name | Value |
| --- | --- |
| One | 1 |
| Two | 2 |
`;

const INITIAL_FILES = new Map<string, string>([
  [FILE_PATH, INITIAL_MARKDOWN],
  ['notes/target.md', '# Target note\n\nSecondary target content.\n'],
  ['docs/guide.md', '# Guide\n\nLinked guide.\n'],
]);

const savedFiles = new Map<string, string>(INITIAL_FILES);
let lastOpenedUrl: string | null = null;

function resetSavedFiles() {
  savedFiles.clear();
  INITIAL_FILES.forEach((value, key) => {
    savedFiles.set(key, value);
  });
}

function cloneTree(entries: FileEntry[]): FileEntry[] {
  return entries.map((entry) => ({
    ...entry,
    children: entry.children ? cloneTree(entry.children) : undefined,
  }));
}

function PlaywrightHotkeysLayer() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchOpenToken, setSearchOpenToken] = useState(0);

  const openSearch = useCallback((initialQuery = '') => {
    setSearchInitialQuery(initialQuery);
    setSearchOpenToken((current) => current + 1);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const openFindInFile = useCallback(() => {
    window.dispatchEvent(new CustomEvent('volt:find-in-file'));
  }, []);

  useWorkspaceHotkeys({
    voltId: VOLT_ID,
    onOpenSearch: openSearch,
    onToggleSidebar: () => undefined,
    onOpenFindInFile: openFindInFile,
  });

  return (
    <SearchPopup
      isOpen={searchOpen}
      initialQuery={searchInitialQuery}
      openToken={searchOpenToken}
      onClose={closeSearch}
      voltId={VOLT_ID}
      voltPath={VOLT_PATH}
      onToggleSidebar={() => undefined}
    />
  );
}

export function PlaywrightEditorHarness() {
  const activeTabId = useTabStore((state) => state.activeTabs[VOLT_ID] ?? FILE_PATH);
  const activeTab = useTabStore((state) => (state.tabs[VOLT_ID] ?? []).find((tab) => tab.id === activeTabId) ?? null);
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : FILE_PATH;

  useEffect(() => {
    resetSavedFiles();
    lastOpenedUrl = null;

    window.go = {
      wailshandler: {
        FileHandler: {
          ReadFile: async (_voltPath: string, filePath: string) => savedFiles.get(filePath) ?? '',
          WriteFile: async (_voltPath: string, filePath: string, content: string) => {
            savedFiles.set(filePath, content);
          },
          ListTree: async () => cloneTree(INITIAL_FILE_TREE),
          CreateDirectory: async () => undefined,
          CreateFile: async (_voltPath: string, filePath: string, content: string) => {
            savedFiles.set(filePath, content);
          },
          DeletePath: async () => undefined,
          RenamePath: async () => undefined,
        },
      },
    };

    window.runtime = {
      ...(window.runtime ?? {}),
      BrowserOpenURL: (url: string) => {
        lastOpenedUrl = url;
      },
    };

    useFileTreeStore.setState((state) => ({
      ...state,
      trees: { ...state.trees, [VOLT_ID]: cloneTree(INITIAL_FILE_TREE) },
      selectedPath: { ...state.selectedPath, [VOLT_ID]: FILE_PATH },
      expandedPaths: { ...state.expandedPaths, [VOLT_ID]: ['notes', 'docs', 'files'] },
    }));

    useTabStore.setState((state) => ({
      ...state,
      tabs: {
        ...state.tabs,
        [VOLT_ID]: [{
          id: FILE_PATH,
          type: 'file',
          filePath: FILE_PATH,
          fileName: 'test',
          isDirty: false,
        }],
      },
      activeTabs: {
        ...state.activeTabs,
        [VOLT_ID]: FILE_PATH,
      },
      pendingRenames: {
        ...state.pendingRenames,
        [VOLT_ID]: null,
      },
    }));

    window.__VOLT_PLAYWRIGHT__ = {
      getActiveTab: () => useTabStore.getState().activeTabs[VOLT_ID] ?? null,
      getOpenedUrl: () => lastOpenedUrl,
      getSavedFile: (path: string) => savedFiles.get(path) ?? null,
      getMarkdown: () => {
        const editor = getEditor();
        const markdownStorage = (editor?.storage as { markdown?: { getMarkdown?: () => string } } | undefined)?.markdown;
        return markdownStorage?.getMarkdown?.() ?? null;
      },
      getSelectionRange: () => {
        const editor = getEditor();
        if (!editor) {
          return null;
        }

        const { from, to } = editor.state.selection;
        return { from, to };
      },
      insertMathBlock: () => {
        getEditor()?.chain().focus('end').insertContent({ type: 'mathBlock', attrs: { latex: '' } }).run();
      },
      insertMathInline: () => {
        getEditor()?.chain().focus('end').insertContent({ type: 'mathInline', attrs: { latex: '' } }).run();
      },
      insertCodeBlock: () => {
        getEditor()?.chain().focus('end').toggleCodeBlock().run();
      },
      reset: () => {
        resetSavedFiles();
        lastOpenedUrl = null;
      },
    };

    return () => {
      delete window.__VOLT_PLAYWRIGHT__;
    };
  }, []);

  return (
    <div
      data-testid="playwright-editor-harness"
      style={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr)',
      }}
    >
      <div style={{ minWidth: 0, borderRight: '1px solid var(--color-border)' }}>
        <FileTree voltId={VOLT_ID} voltPath={VOLT_PATH} />
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-secondary)' }}>
        <FileTabs voltId={VOLT_ID} />
        <div style={{ minWidth: 0, minHeight: 0, flex: 1, position: 'relative', display: 'flex' }}>
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 12,
              right: 12,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <div style={{ pointerEvents: 'auto' }}>
              <Breadcrumbs voltId={VOLT_ID} />
            </div>
          </div>
          <EditorPanel voltId={VOLT_ID} voltPath={VOLT_PATH} filePath={activeFilePath} />
        </div>
      </div>
      <PlaywrightHotkeysLayer />
    </div>
  );
}
