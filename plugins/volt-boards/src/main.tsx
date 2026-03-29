import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import excalidrawCss from '@excalidraw/excalidraw/index.css?inline';
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  THEME,
  defaultLang,
  languages as excalidrawLanguages,
  convertToExcalidrawElements,
  newElementWith,
  restore,
  serializeAsJSON,
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawElement,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/types';
import localCss from './styles.css?inline';
import { getPluginUiMessages } from './i18n';

const STYLE_ID = 'volt-boards-plugin-styles';
const BOARD_EXTENSION = '.board';
const NOTE_LINK_PREFIX = 'volt://note/';
const DEFAULT_ATTACHMENTS_DIR = 'attachments/boards';
const DEFAULT_AUTOSAVE_DELAY = 750;
const DEFAULT_CANVAS_BACKGROUND_LIGHT = '#f7f7f5';
const DEFAULT_CANVAS_BACKGROUND_DARK = '#202020';
const DEFAULT_GRID_SIZE = 20;
const DEFAULT_THEME_MODE = 'system';
const DEFAULT_FONT_FAMILY_KEY = 'helvetica';
const DEFAULT_FILL_STYLE = 'solid';
const DEFAULT_ROUGHNESS = 0;

type PluginFileViewerContext = {
  voltId: string;
  voltPath: string;
  filePath: string;
  fileName: string;
  setDirty(dirty: boolean): void;
  registerSaveHandler(handler: () => Promise<void>): () => void;
};

type FileEntry = {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
};

type VoltPluginAPI = {
  volt: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    createFile(path: string, content?: string): Promise<void>;
    list(dirPath?: string): Promise<unknown[]>;
  };
  media: {
    pickImage(): Promise<string>;
    copyImage(sourcePath: string, targetDir?: string): Promise<string>;
    saveImageBase64(fileName: string, base64: string, targetDir?: string): Promise<string>;
    readImageDataUrl(path: string): Promise<string>;
  };
  ui: {
    promptText(config: {
      title: string;
      description?: string;
      placeholder?: string;
      submitLabel?: string;
      initialValue?: string;
      multiline?: boolean;
    }): Promise<string | null>;
    registerCommand(config: {
      id: string;
      name: string;
      callback: () => void | Promise<void>;
    }): void;
    registerContextMenuItem(config: {
      id: string;
      label: string;
      icon?: string;
      filter?: (entry: { path: string; isDir: boolean }) => boolean;
      callback: (entry: { path: string; isDir: boolean }) => void | Promise<void>;
    }): void;
    registerToolbarButton(config: {
      id: string;
      label: string;
      icon: string;
      callback: () => void | Promise<void>;
    }): void;
    registerSidebarButton(config: {
      id: string;
      label: string;
      icon: string;
      callback: () => void | Promise<void>;
    }): void;
    registerFileViewer(config: {
      id: string;
      extensions: string[];
      icon?: string;
      render: (container: HTMLElement, context: PluginFileViewerContext) => void;
      cleanup?: () => void;
    }): void;
    openFile(path: string): void;
    showNotice(message: string, durationMs?: number): void;
  };
  events: {
    on(event: string, callback: (...args: unknown[]) => void | Promise<void>): () => void;
  };
  settings: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    getAll(): Promise<Record<string, unknown>>;
    onChange(callback: (event: { key: string; value: unknown }) => void | Promise<void>): () => void;
  };
};

type BoardDocument = Record<string, unknown> & {
  elements?: readonly ExcalidrawElement[] | null;
  appState?: Partial<AppState> | null;
  files?: BinaryFiles;
};

type SceneSnapshot = {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

type VoltTheme = 'light' | 'dark';
type BoardThemeMode = VoltTheme | 'system';
type BoardFontFamilyKey = 'virgil' | 'helvetica' | 'cascadia';
type BoardFillStyle = 'solid' | 'hachure' | 'cross-hatch' | 'zigzag';
type BoardLanguageMode = 'system' | string;

type BoardPluginSettings = {
  attachmentsDir: string;
  autosaveDelayMs: number;
  themeMode: BoardThemeMode;
  language: BoardLanguageMode;
  canvasBackgroundLight: string;
  canvasBackgroundDark: string;
  gridModeEnabled: boolean;
  gridSize: number;
  defaultFontFamily: BoardFontFamilyKey;
  defaultFillStyle: BoardFillStyle;
  defaultRoughness: number;
};

const DEFAULT_BOARD_SETTINGS: BoardPluginSettings = {
  attachmentsDir: DEFAULT_ATTACHMENTS_DIR,
  autosaveDelayMs: DEFAULT_AUTOSAVE_DELAY,
  themeMode: DEFAULT_THEME_MODE,
  language: 'system',
  canvasBackgroundLight: DEFAULT_CANVAS_BACKGROUND_LIGHT,
  canvasBackgroundDark: DEFAULT_CANVAS_BACKGROUND_DARK,
  gridModeEnabled: false,
  gridSize: DEFAULT_GRID_SIZE,
  defaultFontFamily: DEFAULT_FONT_FAMILY_KEY,
  defaultFillStyle: DEFAULT_FILL_STYLE,
  defaultRoughness: DEFAULT_ROUGHNESS,
};

function ensureStylesInjected(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${excalidrawCss}\n${localCss}`;
  document.head.appendChild(style);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md');
}

function ensureBoardPath(path: string): string {
  return path.toLowerCase().endsWith(BOARD_EXTENSION) ? path : `${path}${BOARD_EXTENSION}`;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  step = 1,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const clamped = Math.min(Math.max(value, min), max);
  return Math.round(clamped / step) * step;
}

function normalizeBoardThemeMode(value: unknown): BoardThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : DEFAULT_BOARD_SETTINGS.themeMode;
}

const EXCALIDRAW_LANGUAGE_BY_CODE = new Map(
  excalidrawLanguages.map((language) => [language.code.toLowerCase(), language]),
);

function findMatchingExcalidrawLanguage(locale: string): string | null {
  const normalized = locale.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const directMatch = EXCALIDRAW_LANGUAGE_BY_CODE.get(normalized);
  if (directMatch) {
    return directMatch.code;
  }

  const primaryLanguage = normalized.split('-')[0];
  const looseMatch = excalidrawLanguages.find((language) => (
    language.code.toLowerCase().split('-')[0] === primaryLanguage
  ));

  return looseMatch?.code ?? null;
}

function normalizeBoardLanguage(value: unknown): BoardLanguageMode {
  if (value === 'system') {
    return 'system';
  }

  if (typeof value !== 'string') {
    return DEFAULT_BOARD_SETTINGS.language;
  }

  return findMatchingExcalidrawLanguage(value) ?? DEFAULT_BOARD_SETTINGS.language;
}

function normalizeBoardFontFamily(value: unknown): BoardFontFamilyKey {
  return value === 'virgil' || value === 'helvetica' || value === 'cascadia'
    ? value
    : DEFAULT_BOARD_SETTINGS.defaultFontFamily;
}

function normalizeBoardFillStyle(value: unknown): BoardFillStyle {
  return value === 'solid'
    || value === 'hachure'
    || value === 'cross-hatch'
    || value === 'zigzag'
    ? value
    : DEFAULT_BOARD_SETTINGS.defaultFillStyle;
}

function normalizeBoardSettings(values: Record<string, unknown> = {}): BoardPluginSettings {
  return {
    attachmentsDir: typeof values.attachmentsDir === 'string' && values.attachmentsDir.trim()
      ? values.attachmentsDir.trim()
      : DEFAULT_BOARD_SETTINGS.attachmentsDir,
    autosaveDelayMs: clampNumber(values.autosaveDelayMs, DEFAULT_BOARD_SETTINGS.autosaveDelayMs, 100, 5_000, 50),
    themeMode: normalizeBoardThemeMode(values.themeMode),
    language: normalizeBoardLanguage(values.language),
    canvasBackgroundLight: typeof values.canvasBackgroundLight === 'string' && values.canvasBackgroundLight.trim()
      ? values.canvasBackgroundLight.trim()
      : DEFAULT_BOARD_SETTINGS.canvasBackgroundLight,
    canvasBackgroundDark: typeof values.canvasBackgroundDark === 'string' && values.canvasBackgroundDark.trim()
      ? values.canvasBackgroundDark.trim()
      : DEFAULT_BOARD_SETTINGS.canvasBackgroundDark,
    gridModeEnabled: typeof values.gridModeEnabled === 'boolean'
      ? values.gridModeEnabled
      : DEFAULT_BOARD_SETTINGS.gridModeEnabled,
    gridSize: clampNumber(values.gridSize, DEFAULT_BOARD_SETTINGS.gridSize, 4, 96, 4),
    defaultFontFamily: normalizeBoardFontFamily(values.defaultFontFamily),
    defaultFillStyle: normalizeBoardFillStyle(values.defaultFillStyle),
    defaultRoughness: clampNumber(values.defaultRoughness, DEFAULT_BOARD_SETTINGS.defaultRoughness, 0, 4),
  };
}

function areBoardSettingsEqual(left: BoardPluginSettings, right: BoardPluginSettings): boolean {
  return left.attachmentsDir === right.attachmentsDir
    && left.autosaveDelayMs === right.autosaveDelayMs
    && left.themeMode === right.themeMode
    && left.language === right.language
    && left.canvasBackgroundLight === right.canvasBackgroundLight
    && left.canvasBackgroundDark === right.canvasBackgroundDark
    && left.gridModeEnabled === right.gridModeEnabled
    && left.gridSize === right.gridSize
    && left.defaultFontFamily === right.defaultFontFamily
    && left.defaultFillStyle === right.defaultFillStyle
    && left.defaultRoughness === right.defaultRoughness;
}

function resolveVoltTheme(): VoltTheme {
  return document.documentElement.getAttribute('data-theme') === THEME.DARK
    ? THEME.DARK
    : THEME.LIGHT;
}

function resolveVoltLocale(): string {
  return document.documentElement.lang || defaultLang.code;
}

function resolveBoardTheme(themeMode: BoardThemeMode, voltTheme: VoltTheme): AppState['theme'] {
  return themeMode === 'system' ? voltTheme : themeMode;
}

function resolveBoardLanguage(language: BoardLanguageMode, voltLocale: string): string {
  if (language !== 'system') {
    return findMatchingExcalidrawLanguage(language) ?? defaultLang.code;
  }

  return findMatchingExcalidrawLanguage(voltLocale) ?? defaultLang.code;
}

function resolveBoardFontFamily(fontFamily: BoardFontFamilyKey): AppState['currentItemFontFamily'] {
  switch (fontFamily) {
    case 'virgil':
      return FONT_FAMILY.Virgil;
    case 'cascadia':
      return FONT_FAMILY.Cascadia;
    default:
      return FONT_FAMILY.Helvetica;
  }
}

function getBoardCanvasBackground(settings: BoardPluginSettings, theme: AppState['theme']): string {
  return theme === THEME.DARK
    ? settings.canvasBackgroundDark
    : settings.canvasBackgroundLight;
}

function getBoardAppStatePatch(
  settings: BoardPluginSettings,
  theme: AppState['theme'],
): Partial<AppState> {
  return {
    theme,
    viewBackgroundColor: getBoardCanvasBackground(settings, theme),
    gridModeEnabled: settings.gridModeEnabled,
    gridSize: settings.gridSize,
    currentItemFontFamily: resolveBoardFontFamily(settings.defaultFontFamily),
    currentItemFillStyle: settings.defaultFillStyle,
    currentItemRoughness: settings.defaultRoughness,
  };
}

function applyBoardSettingsToInitialData(
  initialData: ExcalidrawInitialDataState,
  settings: BoardPluginSettings,
  theme: AppState['theme'],
): ExcalidrawInitialDataState {
  return {
    ...initialData,
    appState: {
      ...(isRecord(initialData.appState) ? initialData.appState : {}),
      ...getBoardAppStatePatch(settings, theme),
    },
  };
}

async function loadBoardSettings(settingsApi: VoltPluginAPI['settings']): Promise<BoardPluginSettings> {
  return normalizeBoardSettings(await settingsApi.getAll());
}

function getBoardTemplate(appStateOverrides: Partial<AppState> = {}): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'volt-boards',
    elements: [],
    appState: {
      theme: THEME.LIGHT,
      viewBackgroundColor: DEFAULT_CANVAS_BACKGROUND_LIGHT,
      gridModeEnabled: DEFAULT_BOARD_SETTINGS.gridModeEnabled,
      gridSize: DEFAULT_BOARD_SETTINGS.gridSize,
      currentItemFontFamily: resolveBoardFontFamily(DEFAULT_BOARD_SETTINGS.defaultFontFamily),
      currentItemFillStyle: DEFAULT_BOARD_SETTINGS.defaultFillStyle,
      currentItemRoughness: DEFAULT_BOARD_SETTINGS.defaultRoughness,
      ...appStateOverrides,
    },
    files: {},
  }, null, 2);
}

function flattenMarkdownFiles(entries: FileEntry[]): FileEntry[] {
  const files: FileEntry[] = [];

  for (const entry of entries) {
    if (entry.isDir) {
      files.push(...flattenMarkdownFiles(entry.children ?? []));
      continue;
    }

    if (isMarkdownPath(entry.path)) {
      files.push(entry);
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function getSelectedElementIds(appState: AppState): string[] {
  return Object.entries(appState.selectedElementIds)
    .filter(([, selected]) => Boolean(selected))
    .map(([elementId]) => elementId);
}

function rewriteTargetPath(pathValue: string, oldPath: string, newPath: string): string {
  if (pathValue === oldPath) {
    return newPath;
  }

  if (pathValue.startsWith(`${oldPath}/`)) {
    return `${newPath}${pathValue.slice(oldPath.length)}`;
  }

  return pathValue;
}

function encodeNoteLink(path: string): string {
  return `${NOTE_LINK_PREFIX}${encodeURIComponent(path)}`;
}

function decodeNoteLink(link: string): string | null {
  if (!link.startsWith(NOTE_LINK_PREFIX)) {
    return null;
  }

  try {
    return decodeURIComponent(link.slice(NOTE_LINK_PREFIX.length));
  } catch {
    return null;
  }
}

function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match?.[1] ?? 'application/octet-stream';
}

function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    case 'image/x-icon':
      return 'ico';
    default:
      return 'png';
  }
}

function dataUrlToBase64(dataUrl: string): string {
  const [, base64 = ''] = dataUrl.split(',');
  return base64;
}

async function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error(getPluginUiMessages(resolveVoltLocale()).errors.failedToLoadImageDimensions));
    image.src = dataUrl;
  });
}

function buildImageFile(fileId: string, dataUrl: string): BinaryFileData {
  return {
    id: fileId as BinaryFileData['id'],
    dataURL: dataUrl as BinaryFileData['dataURL'],
    mimeType: getMimeTypeFromDataUrl(dataUrl) as BinaryFileData['mimeType'],
    created: Date.now(),
  };
}

function getElementAssetPath(element: ExcalidrawElement): string | null {
  const customData = isRecord(element.customData) ? element.customData : null;
  return typeof customData?.assetPath === 'string' ? customData.assetPath : null;
}

function mergeUnknownElementFields(
  originalElements: readonly Record<string, unknown>[],
  nextElements: readonly ExcalidrawElement[],
): readonly ExcalidrawElement[] {
  const originalById = new Map<string, Record<string, unknown>>();
  for (const element of originalElements) {
    if (typeof element.id === 'string') {
      originalById.set(element.id, element);
    }
  }

  return nextElements.map((element) => {
    const original = originalById.get(element.id);
    if (!original) {
      return element;
    }

    const merged = {
      ...original,
      ...element,
    } as ExcalidrawElement;

    if (isRecord(original.customData) && isRecord(element.customData)) {
      merged.customData = {
        ...original.customData,
        ...element.customData,
      };
    }

    return merged;
  });
}

function mergeUnknownDocumentFields(rawDocument: BoardDocument, nextDocument: BoardDocument): BoardDocument {
  const originalElements = Array.isArray(rawDocument.elements)
    ? rawDocument.elements.filter(isRecord)
    : [];

  return {
    ...rawDocument,
    ...nextDocument,
    appState: {
      ...(isRecord(rawDocument.appState) ? rawDocument.appState : {}),
      ...(isRecord(nextDocument.appState) ? nextDocument.appState : {}),
    },
    elements: mergeUnknownElementFields(originalElements, nextDocument.elements ?? []),
  };
}

async function hydrateBinaryFiles(
  api: VoltPluginAPI,
  elements: readonly ExcalidrawElement[],
  existingFiles: BinaryFiles = {},
): Promise<BinaryFiles> {
  const files: BinaryFiles = { ...existingFiles };

  await Promise.all(elements.map(async (element) => {
    if (element.type !== 'image' || !element.fileId) {
      return;
    }

    const assetPath = getElementAssetPath(element);
    if (!assetPath || files[element.fileId]) {
      return;
    }

    try {
      const dataUrl = await api.media.readImageDataUrl(assetPath);
      files[element.fileId] = buildImageFile(element.fileId, dataUrl);
    } catch {
      // Ignore missing attachments and let Excalidraw render a broken image placeholder.
    }
  }));

  return files;
}

async function loadInitialScene(
  api: VoltPluginAPI,
  filePath: string,
  defaultAppState: Partial<AppState>,
): Promise<{ document: BoardDocument; initialData: ExcalidrawInitialDataState }> {
  const raw = await api.volt.read(filePath);
  if (!raw.trim()) {
    const emptyDocument = JSON.parse(getBoardTemplate(defaultAppState)) as BoardDocument;
    return {
      document: emptyDocument,
      initialData: emptyDocument as ExcalidrawInitialDataState,
    };
  }

  const parsed = JSON.parse(raw) as BoardDocument;
  const restored = restore(parsed, null, null);
  const files = await hydrateBinaryFiles(api, restored.elements ?? [], parsed.files ?? {});

  return {
    document: parsed,
    initialData: {
      ...parsed,
      elements: restored.elements ?? [],
      appState: restored.appState ?? {},
      files,
    },
  };
}

async function persistSceneDocument(
  api: VoltPluginAPI,
  filePath: string,
  rawDocument: BoardDocument,
  snapshot: SceneSnapshot,
  attachmentsDir: string,
): Promise<BoardDocument> {
  const nextElements: ExcalidrawElement[] = [];

  for (const element of snapshot.elements) {
    if (element.type !== 'image' || !element.fileId) {
      nextElements.push(element);
      continue;
    }

    const existingAssetPath = getElementAssetPath(element);
    let assetPath = existingAssetPath;
    const file = snapshot.files[element.fileId];

    if (!assetPath && file?.dataURL) {
      const extension = getExtensionFromMimeType(file.mimeType);
      const fileName = `board-image-${element.fileId}.${extension}`;
      assetPath = await api.media.saveImageBase64(
        fileName,
        dataUrlToBase64(file.dataURL),
        attachmentsDir,
      );
    }

    if (assetPath) {
      nextElements.push(newElementWith(element, {
        customData: {
          ...(isRecord(element.customData) ? element.customData : {}),
          assetPath,
        },
      }));
      continue;
    }

    nextElements.push(element);
  }

  const serialized = JSON.parse(
    serializeAsJSON(nextElements, snapshot.appState, {}, 'local'),
  ) as BoardDocument;

  const merged = mergeUnknownDocumentFields(rawDocument, serialized);
  await api.volt.write(filePath, JSON.stringify(merged, null, 2));
  return merged;
}

async function insertImageIntoScene(
  excalidrawAPI: ExcalidrawImperativeAPI,
  dataUrl: string,
  assetPath: string,
) {
  const { width, height } = await loadImageSize(dataUrl);
  const fileId = crypto.randomUUID();
  const appState = excalidrawAPI.getAppState();
  const [imageElement] = convertToExcalidrawElements([
    {
      type: 'image',
      fileId: fileId as never,
      x: appState.scrollX + appState.width / 2 - width / 2,
      y: appState.scrollY + appState.height / 2 - height / 2,
      width,
      height,
      customData: {
        assetPath,
      },
    },
  ]);

  excalidrawAPI.addFiles([buildImageFile(fileId, dataUrl)]);
  excalidrawAPI.updateScene({
    elements: [...excalidrawAPI.getSceneElements(), imageElement],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

function rewriteSceneLinks(
  elements: readonly OrderedExcalidrawElement[],
  oldPath: string,
  newPath: string,
): readonly OrderedExcalidrawElement[] {
  let changed = false;

  const nextElements = elements.map((element) => {
    const currentNotePath = typeof element.link === 'string'
      ? decodeNoteLink(element.link)
      : null;
    const customData = isRecord(element.customData) ? element.customData : {};
    const storedNotePath = typeof customData.notePath === 'string' ? customData.notePath : null;
    const notePath = storedNotePath ?? currentNotePath;

    if (!notePath) {
      return element;
    }

    const rewritten = rewriteTargetPath(notePath, oldPath, newPath);
    if (rewritten === notePath) {
      return element;
    }

    changed = true;
    return newElementWith(element, {
      link: encodeNoteLink(rewritten),
      customData: {
        ...customData,
        notePath: rewritten,
      },
    });
  });

  return changed ? nextElements : elements;
}

function NotePicker({
  notes,
  query,
  onQueryChange,
  onSelect,
  onClose,
  messages,
}: {
  notes: FileEntry[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (path: string) => void;
  onClose: () => void;
  messages: ReturnType<typeof getPluginUiMessages>;
}) {
  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return notes;
    }

    return notes.filter((entry) => (
      entry.path.toLowerCase().includes(normalized) ||
      entry.name.toLowerCase().includes(normalized)
    ));
  }, [notes, query]);

  return (
    <div className="volt-boards-modal" onClick={onClose}>
      <div className="volt-boards-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 className="volt-boards-modal-title">{messages.notePicker.title}</h2>
        <p className="volt-boards-modal-description">
          {messages.notePicker.description}
        </p>
        <input
          className="volt-boards-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={messages.notePicker.filterPlaceholder}
          autoFocus
        />
        <div className="volt-boards-note-list">
          {filteredNotes.map((note) => (
            <button
              key={note.path}
              type="button"
              className="volt-boards-note-item"
              onClick={() => onSelect(note.path)}
            >
              <strong>{note.name.replace(/\.md$/i, '')}</strong>
              <span>{note.path}</span>
            </button>
          ))}
          {filteredNotes.length === 0 ? (
            <div className="volt-boards-modal-description">{messages.notePicker.empty}</div>
          ) : null}
        </div>
        <div className="volt-boards-modal-actions">
          <button type="button" className="volt-boards-button" onClick={onClose}>
            {messages.actions.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardViewer({
  api,
  context,
}: {
  api: VoltPluginAPI;
  context: PluginFileViewerContext;
}) {
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<FileEntry[]>([]);
  const [noteQuery, setNoteQuery] = useState('');
  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [boardSettings, setBoardSettings] = useState(DEFAULT_BOARD_SETTINGS);
  const [voltTheme, setVoltTheme] = useState<VoltTheme>(() => resolveVoltTheme());
  const [voltLocale, setVoltLocale] = useState(() => resolveVoltLocale());
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneRef = useRef<SceneSnapshot | null>(null);
  const rawDocumentRef = useRef<BoardDocument>(JSON.parse(getBoardTemplate()) as BoardDocument);
  const saveTimerRef = useRef<number | null>(null);
  const ignoredChangeCountRef = useRef(0);
  const initialDocumentLangRef = useRef<string | null>(null);
  const initialDocumentDirRef = useRef<string | null>(null);
  const boardSettingsRef = useRef(DEFAULT_BOARD_SETTINGS);
  const resolvedThemeRef = useRef<AppState['theme']>(THEME.LIGHT);
  const boardAppStatePatchRef = useRef<Partial<AppState>>(getBoardAppStatePatch(DEFAULT_BOARD_SETTINGS, THEME.LIGHT));

  const resolvedTheme = useMemo(
    () => resolveBoardTheme(boardSettings.themeMode, voltTheme),
    [boardSettings.themeMode, voltTheme],
  );
  const resolvedLanguage = useMemo(
    () => resolveBoardLanguage(boardSettings.language, voltLocale),
    [boardSettings.language, voltLocale],
  );
  const pluginUi = useMemo(
    () => getPluginUiMessages(voltLocale),
    [voltLocale],
  );
  const boardAppStatePatch = useMemo(
    () => getBoardAppStatePatch(boardSettings, resolvedTheme),
    [
      boardSettings.canvasBackgroundDark,
      boardSettings.canvasBackgroundLight,
      boardSettings.defaultFillStyle,
      boardSettings.defaultFontFamily,
      boardSettings.defaultRoughness,
      boardSettings.gridModeEnabled,
      boardSettings.gridSize,
      resolvedTheme,
    ],
  );
  const boardShellStyle = useMemo(() => ({
    '--volt-board-canvas-background': getBoardCanvasBackground(boardSettings, resolvedTheme),
  }) as React.CSSProperties, [boardSettings, resolvedTheme]);

  const ignoreNextChange = useCallback(() => {
    ignoredChangeCountRef.current += 1;
  }, []);

  useEffect(() => {
    boardSettingsRef.current = boardSettings;
  }, [boardSettings]);

  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    boardAppStatePatchRef.current = boardAppStatePatch;
  }, [boardAppStatePatch]);

  const saveScene = useCallback(async () => {
    if (!sceneRef.current) {
      return;
    }

    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      const nextDocument = await persistSceneDocument(
        api,
        context.filePath,
        rawDocumentRef.current,
        sceneRef.current,
        boardSettings.attachmentsDir,
      );
      rawDocumentRef.current = nextDocument;
      context.setDirty(false);
    } catch (error) {
      console.error('Failed to save board:', error);
      api.ui.showNotice(pluginUi.notices.failedToSaveBoard);
    }
  }, [api, boardSettings.attachmentsDir, context, pluginUi.notices.failedToSaveBoard]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveScene();
    }, boardSettings.autosaveDelayMs);
  }, [boardSettings.autosaveDelayMs, saveScene]);

  const refreshSettings = useCallback(async () => {
    const nextSettings = await loadBoardSettings(api.settings);
    setBoardSettings((current) => (
      areBoardSettingsEqual(current, nextSettings) ? current : nextSettings
    ));
  }, [api.settings]);

  useEffect(() => {
    ensureStylesInjected();
    initialDocumentLangRef.current = document.documentElement.getAttribute('lang');
    initialDocumentDirRef.current = document.documentElement.getAttribute('dir');
    void refreshSettings();

    const unsubscribeSettings = api.settings.onChange(() => {
      void refreshSettings();
    });

    return () => {
      unsubscribeSettings();
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }

      if (initialDocumentLangRef.current) {
        document.documentElement.setAttribute('lang', initialDocumentLangRef.current);
      } else {
        document.documentElement.removeAttribute('lang');
      }

      if (initialDocumentDirRef.current) {
        document.documentElement.setAttribute('dir', initialDocumentDirRef.current);
      } else {
        document.documentElement.removeAttribute('dir');
      }
    };
  }, [api.settings, refreshSettings]);

  useEffect(() => {
    const syncTheme = () => {
      setVoltTheme((currentTheme) => {
        const nextTheme = resolveVoltTheme();
        return currentTheme === nextTheme ? currentTheme : nextTheme;
      });
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const syncLocale = () => {
      setVoltLocale((currentLocale) => {
        const nextLocale = resolveVoltLocale();
        return currentLocale === nextLocale ? currentLocale : nextLocale;
      });
    };

    syncLocale();

    const observer = new MutationObserver(syncLocale);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const loaded = await loadInitialScene(api, context.filePath, boardAppStatePatchRef.current);
        if (cancelled) {
          return;
        }

        const configuredInitialData = applyBoardSettingsToInitialData(
          loaded.initialData,
          boardSettingsRef.current,
          resolvedThemeRef.current,
        );

        rawDocumentRef.current = loaded.document;
        sceneRef.current = {
          elements: (configuredInitialData.elements ?? []) as readonly OrderedExcalidrawElement[],
          appState: (configuredInitialData.appState ?? {}) as AppState,
          files: configuredInitialData.files ?? {},
        };
        ignoreNextChange();
        setInitialData(configuredInitialData);
        setLoadError(null);
        context.setDirty(false);
      } catch (error) {
        console.error('Failed to load board:', error);
        setLoadError(pluginUi.notices.failedToLoadBoard);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, context, ignoreNextChange]);

  useEffect(() => context.registerSaveHandler(saveScene), [context, saveScene]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current = {
        ...sceneRef.current,
        appState: {
          ...sceneRef.current.appState,
          ...boardAppStatePatch,
        },
      };
    }

    setInitialData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        appState: {
          ...(isRecord(current.appState) ? current.appState : {}),
          ...boardAppStatePatch,
        },
      };
    });

    if (!excalidrawApiRef.current) {
      return;
    }

    ignoreNextChange();
    excalidrawApiRef.current.updateScene({
      appState: boardAppStatePatch,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [boardAppStatePatch, ignoreNextChange]);

  useEffect(() => api.events.on('workspace:path-renamed', (payload) => {
    if (!isRecord(payload)) {
      return;
    }

    const oldPath = typeof payload.oldPath === 'string' ? payload.oldPath : null;
    const newPath = typeof payload.newPath === 'string' ? payload.newPath : null;
    if (!oldPath || !newPath || !sceneRef.current || !excalidrawApiRef.current) {
      return;
    }

    const nextElements = rewriteSceneLinks(sceneRef.current.elements, oldPath, newPath);
    if (nextElements === sceneRef.current.elements) {
      return;
    }

    sceneRef.current = {
      ...sceneRef.current,
      elements: nextElements,
    };

    ignoreNextChange();
    excalidrawApiRef.current.updateScene({
      elements: nextElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    context.setDirty(true);
    scheduleSave();
  }), [api.events, context, ignoreNextChange, scheduleSave]);

  const loadNotes = useCallback(async () => {
    const entries = (await api.volt.list()) as FileEntry[];
    setNotes(flattenMarkdownFiles(entries));
  }, [api.volt]);

  const openNotePicker = useCallback(async () => {
    const excalidrawApi = excalidrawApiRef.current;
    if (!excalidrawApi) {
      return;
    }

    const selectedIds = getSelectedElementIds(excalidrawApi.getAppState());
    if (selectedIds.length === 0) {
      api.ui.showNotice(pluginUi.notices.selectElementBeforeLinking);
      return;
    }

    await loadNotes();
    setNoteQuery('');
    setNotePickerOpen(true);
  }, [api.ui, loadNotes, pluginUi.notices.selectElementBeforeLinking]);

  const attachSelectedElementsToNote = useCallback((notePath: string) => {
    const excalidrawApi = excalidrawApiRef.current;
    const currentScene = sceneRef.current;
    if (!excalidrawApi || !currentScene) {
      return;
    }

    const selectedIds = new Set(getSelectedElementIds(excalidrawApi.getAppState()));
    if (selectedIds.size === 0) {
      api.ui.showNotice(pluginUi.notices.selectElementBeforeLinking);
      return;
    }

    const nextElements = currentScene.elements.map((element) => {
      if (!selectedIds.has(element.id)) {
        return element;
      }

      return newElementWith(element, {
        link: encodeNoteLink(notePath),
        customData: {
          ...(isRecord(element.customData) ? element.customData : {}),
          notePath,
        },
      });
    });

    sceneRef.current = {
      ...currentScene,
      elements: nextElements,
    };

    ignoreNextChange();
    excalidrawApi.updateScene({
      elements: nextElements,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    context.setDirty(true);
    scheduleSave();
    setNotePickerOpen(false);
  }, [api.ui, context, ignoreNextChange, pluginUi.notices.selectElementBeforeLinking, scheduleSave]);

  const importImageFromPicker = useCallback(async () => {
    const excalidrawApi = excalidrawApiRef.current;
    if (!excalidrawApi) {
      return;
    }

    try {
      const sourcePath = await api.media.pickImage();
      if (!sourcePath) {
        return;
      }

      const assetPath = await api.media.copyImage(sourcePath, boardSettings.attachmentsDir);
      const dataUrl = await api.media.readImageDataUrl(assetPath);
      ignoreNextChange();
      await insertImageIntoScene(excalidrawApi, dataUrl, assetPath);
      context.setDirty(true);
      scheduleSave();
    } catch (error) {
      console.error('Failed to import image:', error);
      api.ui.showNotice(pluginUi.notices.failedToImportImage);
    }
  }, [api.media, api.ui, boardSettings.attachmentsDir, context, ignoreNextChange, pluginUi.notices.failedToImportImage, scheduleSave]);

  const handleExternalImage = useCallback(async (fileName: string, dataUrl: string) => {
    const excalidrawApi = excalidrawApiRef.current;
    if (!excalidrawApi) {
      return;
    }

    try {
      const assetPath = await api.media.saveImageBase64(
        fileName,
        dataUrlToBase64(dataUrl),
        boardSettings.attachmentsDir,
      );
      ignoreNextChange();
      await insertImageIntoScene(excalidrawApi, dataUrl, assetPath);
      context.setDirty(true);
      scheduleSave();
    } catch (error) {
      console.error('Failed to insert external image:', error);
      api.ui.showNotice(pluginUi.notices.failedToInsertImage);
    }
  }, [api.media, api.ui, boardSettings.attachmentsDir, context, ignoreNextChange, pluginUi.notices.failedToInsertImage, scheduleSave]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const file = Array.from(event.dataTransfer?.files ?? []).find((entry) => entry.type.startsWith('image/'));
    if (!file) {
      return;
    }

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        return;
      }

      void handleExternalImage(file.name, result);
    };
    reader.readAsDataURL(file);
  }, [handleExternalImage]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith('image/'));
    const blob = item?.getAsFile();
    if (!blob) {
      return;
    }

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        return;
      }

      const extension = getExtensionFromMimeType(blob.type);
      void handleExternalImage(`pasted-${Date.now()}.${extension}`, result);
    };
    reader.readAsDataURL(blob);
  }, [handleExternalImage]);

  if (loadError) {
    return <div className="volt-boards-error">{loadError}</div>;
  }

  if (!initialData) {
    return <div className="volt-boards-loading">{pluginUi.status.loadingBoard}</div>;
  }

  return (
    <div
      className="volt-boards-shell"
      style={boardShellStyle}
      onDrop={handleDrop}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
        }
      }}
      onPaste={handlePaste}
    >
      <Excalidraw
        initialData={initialData}
        theme={resolvedTheme}
        langCode={resolvedLanguage}
        gridModeEnabled={boardSettings.gridModeEnabled}
        excalidrawAPI={(apiRef) => {
          excalidrawApiRef.current = apiRef;
        }}
        onChange={(elements, appState, files) => {
          sceneRef.current = { elements, appState, files };

          if (ignoredChangeCountRef.current > 0) {
            ignoredChangeCountRef.current -= 1;
            return;
          }

          context.setDirty(true);
          scheduleSave();
        }}
        onLinkOpen={(element) => {
          const notePath = typeof element.link === 'string'
            ? decodeNoteLink(element.link)
            : null;
          const customData = isRecord(element.customData) ? element.customData : null;
          const targetPath = notePath ?? (typeof customData?.notePath === 'string' ? customData.notePath : null);
          if (targetPath) {
            api.ui.openFile(targetPath);
          }
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            saveAsImage: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          tools: {
            image: false,
          },
        }}
        renderTopRightUI={() => (
          <div className="volt-boards-actions">
            <button type="button" className="volt-boards-button" onClick={() => void importImageFromPicker()}>
              {pluginUi.actions.importImage}
            </button>
            <button
              type="button"
              className="volt-boards-button volt-boards-button--primary"
              onClick={() => void openNotePicker()}
            >
              {pluginUi.actions.linkNote}
            </button>
          </div>
        )}
      />

      {notePickerOpen ? (
        <NotePicker
          notes={notes}
          query={noteQuery}
          onQueryChange={setNoteQuery}
          onSelect={attachSelectedElementsToNote}
          onClose={() => setNotePickerOpen(false)}
          messages={pluginUi}
        />
      ) : null}
    </div>
  );
}

async function promptAndCreateBoard(
  api: VoltPluginAPI,
  initialValue: string,
  locale: string,
) {
  const messages = getPluginUiMessages(locale);
  const value = await api.ui.promptText({
    title: messages.prompts.createBoardTitle,
    description: messages.prompts.createBoardDescription,
    placeholder: messages.prompts.createBoardPlaceholder,
    submitLabel: messages.prompts.createBoardSubmit,
    initialValue,
  });

  if (!value) {
    return;
  }

  const normalizedPath = ensureBoardPath(value.trim());
  const settings = await loadBoardSettings(api.settings);
  const theme = resolveBoardTheme(settings.themeMode, resolveVoltTheme());
  await api.volt.createFile(normalizedPath, getBoardTemplate(getBoardAppStatePatch(settings, theme)));
  api.ui.openFile(normalizedPath);
}

export default function init(api: VoltPluginAPI): void {
  ensureStylesInjected();
  const startupMessages = getPluginUiMessages(resolveVoltLocale());

  const createBoard = async () => {
    await promptAndCreateBoard(
      api,
      startupMessages.prompts.createBoardDefaultPath,
      resolveVoltLocale(),
    );
  };

  api.ui.registerCommand({
    id: 'create-board',
    name: startupMessages.commands.createBoard,
    callback: createBoard,
  });

  api.ui.registerSidebarButton({
    id: 'create-board-sidebar',
    label: startupMessages.commands.createBoard,
    icon: 'file',
    callback: createBoard,
  });

  api.ui.registerContextMenuItem({
    id: 'create-board-in-folder',
    label: startupMessages.commands.newBoard,
    icon: 'file',
    filter: (entry) => entry.isDir,
    callback: async (entry) => {
      const messages = getPluginUiMessages(resolveVoltLocale());
      const value = await api.ui.promptText({
        title: messages.prompts.createBoardInFolderTitle,
        description: messages.prompts.createBoardInFolderDescription(entry.path),
        placeholder: messages.prompts.createBoardInFolderPlaceholder,
        submitLabel: messages.prompts.createBoardSubmit,
        initialValue: messages.prompts.createBoardInFolderDefaultName,
      });

      if (!value) {
        return;
      }

      const normalizedPath = ensureBoardPath(`${entry.path}/${value.trim()}`);
      const settings = await loadBoardSettings(api.settings);
      const theme = resolveBoardTheme(settings.themeMode, resolveVoltTheme());
      await api.volt.createFile(normalizedPath, getBoardTemplate(getBoardAppStatePatch(settings, theme)));
      api.ui.openFile(normalizedPath);
    },
  });

  let currentRoot: Root | null = null;

  api.ui.registerFileViewer({
    id: 'board-viewer',
    extensions: ['.board'],
    icon: 'file',
    render: (container, context) => {
      currentRoot?.unmount();
      currentRoot = createRoot(container);
      currentRoot.render(<BoardViewer api={api} context={context} />);
    },
    cleanup: () => {
      currentRoot?.unmount();
      currentRoot = null;
    },
  });
}
