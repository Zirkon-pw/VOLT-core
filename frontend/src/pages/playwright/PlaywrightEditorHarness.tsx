import { useEffect } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import type { FileEntry } from '@shared/api/file/types';
import { SIDEBAR } from '@shared/config/constants';
import { useNavigationStore } from '@kernel/navigation/NavigationStore';
import { WorkspaceShell } from '@kernel/workspace/ui/WorkspaceShell';
import { useWorkspaceViewStore } from '@kernel/workspace/panes/PaneStore';
import { useFileTreeStore } from '@plugins/file-tree/model';
import { getEditor } from '@kernel/plugin-system/runtime';
import { useTabStore } from '@kernel/workspace/tabs/model';

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
      setMarkdown: (markdown: string) => void;
      getSelectionRange: () => { from: number; to: number } | null;
      getWorkspaceView: () => {
        primaryTabId: string | null;
        secondaryTabId: string | null;
        activePane: 'primary' | 'secondary';
        splitRatio: number;
      } | null;
      appendEmptyParagraphAtEnd: () => void;
      insertEmbedBlock: (url: string) => void;
      insertMathBlock: () => void;
      insertCodeBlock: () => void;
      reset: () => void;
    };
  }
}

const VOLT_ID = 'playwright-volt';
const VOLT_PATH = '/playwright/vault-manager/model';
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

Legacy inline $math$ text

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
const storageEntries = new Map<string, unknown>();
let lastOpenedUrl: string | null = null;

function resetSavedFiles() {
  savedFiles.clear();
  INITIAL_FILES.forEach((value, key) => {
    savedFiles.set(key, value);
  });
}

function resetStorageEntries() {
  storageEntries.clear();
}

function cloneTree(entries: FileEntry[]): FileEntry[] {
  return entries.map((entry) => ({
    ...entry,
    children: entry.children ? cloneTree(entry.children) : undefined,
  }));
}

export function PlaywrightEditorHarness() {
  useEffect(() => {
    resetSavedFiles();
    resetStorageEntries();
    lastOpenedUrl = null;
    localStorage.setItem(SIDEBAR.COLLAPSED_STORAGE_KEY, 'false');
    localStorage.setItem(SIDEBAR.STORAGE_KEY, '260');

    window.go = {
      ...(window.go ?? {}),
      wailshandler: {
        ...(window.go?.wailshandler ?? {}),
        FileHandler: {
          Read: async (_rootPath: string, filePath: string) => savedFiles.get(filePath) ?? '',
          Write: async (_rootPath: string, filePath: string, content: string) => {
            savedFiles.set(filePath, content);
          },
          ListTree: async () => cloneTree(INITIAL_FILE_TREE),
          CreateDirectory: async () => undefined,
          CreateFile: async (_rootPath: string, filePath: string, content: string) => {
            savedFiles.set(filePath, content);
          },
          Delete: async () => undefined,
          Rename: async () => undefined,
        },
        DialogHandler: {
          SelectDirectory: async () => '',
          PickFiles: async () => [],
          PickImage: async () => '',
        },
        ProcessHandler: {
          Start: async () => undefined,
          Cancel: async () => undefined,
        },
        StorageHandler: {
          ConfigDir: async () => '/playwright/.volt',
          Get: async (namespace: string, key: string) => {
            const storageKey = `${namespace}:${key}`;
            if (!storageEntries.has(storageKey)) {
              throw new Error('key not found');
            }
            return storageEntries.get(storageKey);
          },
          Set: async (namespace: string, key: string, value: unknown) => {
            storageEntries.set(`${namespace}:${key}`, value);
          },
          Delete: async (namespace: string, key: string) => {
            storageEntries.delete(`${namespace}:${key}`);
          },
          List: async (namespace: string) => {
            const prefix = `${namespace}:`;
            return Array.from(storageEntries.entries())
              .filter(([storageKey]) => storageKey.startsWith(prefix))
              .map(([storageKey, value]) => ({
                key: storageKey.slice(prefix.length),
                value,
              }));
          },
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

    useNavigationStore.setState({
      history: { [VOLT_ID]: [FILE_PATH] },
      currentIndex: { [VOLT_ID]: 0 },
    });

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

    useWorkspaceViewStore.setState({
      views: {
        [VOLT_ID]: {
          primaryTabId: FILE_PATH,
          secondaryTabId: null,
          activePane: 'primary',
          splitRatio: 0.5,
        },
      },
    });

    window.__VOLT_PLAYWRIGHT__ = {
      getActiveTab: () => useTabStore.getState().activeTabs[VOLT_ID] ?? null,
      getOpenedUrl: () => lastOpenedUrl,
      getSavedFile: (path: string) => savedFiles.get(path) ?? null,
      getMarkdown: () => {
        const editor = getEditor();
        const markdownStorage = (editor?.storage as { markdown?: { getMarkdown?: () => string } } | undefined)?.markdown;
        return markdownStorage?.getMarkdown?.() ?? null;
      },
      setMarkdown: (markdown: string) => {
        const editor = getEditor();
        if (!editor) {
          return;
        }

        editor.commands.setContent(markdown);
        editor.commands.setTextSelection(1);
        editor.view.focus();
      },
      getSelectionRange: () => {
        const editor = getEditor();
        if (!editor) {
          return null;
        }

        const { from, to } = editor.state.selection;
        return { from, to };
      },
      getWorkspaceView: () => useWorkspaceViewStore.getState().views[VOLT_ID] ?? null,
      appendEmptyParagraphAtEnd: () => {
        const editor = getEditor();
        const paragraph = editor?.state.schema.nodes.paragraph;
        if (!editor || !paragraph) {
          return;
        }

        const insertPos = editor.state.doc.content.size;
        const tr = editor.state.tr.insert(insertPos, paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1)).scrollIntoView();
        editor.view.dispatch(tr);
        editor.view.focus();
      },
      insertEmbedBlock: (url: string) => {
        getEditor()?.chain().focus('end').insertContent({ type: 'embedBlock', attrs: { url } }).run();
      },
      insertMathBlock: () => {
        getEditor()?.chain().focus('end').insertContent({ type: 'mathBlock', attrs: { latex: '' } }).run();
      },
      insertCodeBlock: () => {
        getEditor()?.chain().focus('end').toggleCodeBlock().run();
      },
      reset: () => {
        resetSavedFiles();
        resetStorageEntries();
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
        height: '100%',
        minHeight: 0,
      }}
    >
      <WorkspaceShell voltId={VOLT_ID} voltPath={VOLT_PATH} />
    </div>
  );
}
