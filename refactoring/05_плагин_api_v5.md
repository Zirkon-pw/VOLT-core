# Плагин API v5

## 1. Хуки жизненного цикла

```javascript
// main.js плагина — структура v5
export function onLoad(api) {
  // Вызывается при загрузке плагина, до рендера любого UI
  // Вернуть функцию очистки или зарегистрировать хуки жизненного цикла
  api.events.on('workspace:path-renamed', handlePathRename);
  
  return () => {
    // Очистка
  };
}

export function onUnload(api) {
  // Вызывается при выгрузке плагина
  // Подходит для финальной очистки, сохранения состояния
}

export function onSettingsChange(api, event) {
  // Вызывается при изменении любой настройки плагина
  // event: { key, value, values }
}

export function onWorkspaceOpen(api, workspace) {
  // Вызывается при открытии рабочего пространства
  // workspace: { voltId, voltPath, rootPath }
}
```

### Последовательность вызова

1. `onLoad(api)` — загрузка, регистрация UI, команд, обработчиков событий
2. `onWorkspaceOpen(api, workspace)` — открытие workspace (может вызываться многократно)
3. `onSettingsChange(api, event)` — изменение настроек (может вызываться многократно)
4. `onUnload(api)` — выгрузка плагина (финальная очистка)

## 2. Строгие типы TypeScript

### Branded-типы для безопасности путей

```typescript
// До (v4)
api.fs.read(path: string): Promise<string>;

// После (v5) — branded-типы для безопасности путей
declare const __brand: unique symbol;
type Branded<T, B> = T & { [__brand]: B };
type FilePath = Branded<string, 'FilePath'>;
type DirPath = Branded<string, 'DirPath'>;

interface PluginFileSystemAPI {
  read(path: FilePath): Promise<string>;
  write(path: FilePath, content: string): Promise<void>;
  create(path: FilePath, content?: string): Promise<void>;
  list(dirPath?: DirPath): Promise<FileEntry[]>;
  exists(path: FilePath): Promise<boolean>;           // НОВОЕ
  stat(path: FilePath): Promise<FileStat>;            // НОВОЕ
}
```

### Фабрика безопасных путей

```typescript
// Плагин не может создать FilePath из произвольной строки
// Только через API, который проверяет path traversal
const safePath = api.fs.safePath('notes/my-note.md'); // FilePath
```

## 3. Межплагинное взаимодействие

### Отправка сообщений

```typescript
// Плагин A отправляет сообщение
api.plugins.send('obsidian:vault:sync', { action: 'import', paths: [...] });
```

### Прослушивание сообщений

```typescript
// Плагин B слушает
api.plugins.on('obsidian:vault:sync', (payload) => {
  // Обработка запроса синхронизации
});
```

### Ответ на сообщения

```typescript
// Плагин B отвечает
api.plugins.respond('obsidian:vault:sync', requestId, { status: 'ok' });
```

### Информация о плагинах

```typescript
// Список всех плагинов
const plugins = api.plugins.list(); // PluginInfo[]

// Проверка, включён ли плагин
const enabled = api.plugins.isEnabled('my-plugin-id');
```

### Безопасность

- Сообщения проходят через `PermissionChecker`
- Плагин может получать сообщения только от плагинов с разрешением `inter-plugin`
- Все сообщения сериализуются (нет передачи функций/объектов с прототипами)

## 4. Кастомный UI настроек

### Манифест плагина — опциональный кастомный рендерер настроек

```json
{
  "settings": {
    "customUI": true,
    "sections": [...]
  }
}
```

Если `customUI: true` — плагин рендерит собственный UI настроек.
Если `customUI: false` или отсутствует — хост автоматически генерирует UI из `sections`.

### Регистрация кастомного UI настроек

```typescript
api.ui.registerSettingsPage({
  id: 'my-plugin-settings',
  title: 'Мой плагин',
  render: (container: HTMLElement) => {
    // Кастомный React или vanilla JS UI
  },
  cleanup: () => {}
});
```

## 5. Полный интерфейс VoltPluginAPI v5

```typescript
export interface VoltPluginAPI {
  // === Файловая система ===
  fs: {
    read(path: FilePath): Promise<string>;
    write(path: FilePath, content: string): Promise<void>;
    create(path: FilePath, content?: string): Promise<void>;
    list(dirPath?: DirPath): Promise<FileEntry[]>;
    exists(path: FilePath): Promise<boolean>;           // НОВОЕ
    stat(path: FilePath): Promise<FileStat>;            // НОВОЕ
    safePath(path: string): FilePath;                   // НОВОЕ
  };

  // === Рабочее пространство ===
  workspace: {
    getActivePath(): FilePath | null;
    getRootPath(): DirPath;
    onPathRenamed(callback: (oldPath: FilePath, newPath: FilePath) => void): () => void;
  };

  // === Поиск ===
  search: {
    registerTextProvider(config: SearchFileTextProvider): void;
    query(text: string, options?: SearchOptions): Promise<SearchResult[]>; // НОВОЕ
  };

  // === Ассеты ===
  assets: {
    pickImage(): Promise<FilePath>;
    pickFile(config?: PluginFilePickerConfig): Promise<FilePath | FilePath[] | null>;
    copyAsset(sourcePath: FilePath, targetDir?: DirPath): Promise<FilePath>;
    copyImage(sourcePath: FilePath, targetDir?: DirPath): Promise<FilePath>;
    saveImageBase64(fileName: string, base64: string, targetDir?: DirPath): Promise<FilePath>;
    readImageDataUrl(path: FilePath): Promise<string>;
  };

  // === Процессы ===
  process: {
    start(config: ProcessStartConfig): Promise<DesktopProcessHandle>;
  };

  // === Плагины (НОВОЕ) ===
  plugins: {
    send(pluginId: string, channel: string, payload: unknown): void;
    on(pluginId: string, channel: string, callback: (payload: unknown) => void): () => void;
    respond(pluginId: string, channel: string, handler: (payload: unknown) => unknown): () => void;
    list(): PluginInfo[];
    isEnabled(pluginId: string): boolean;
  };

  // === UI ===
  ui: {
    promptText(config: PromptConfig): Promise<string | null>;
    createTaskStatus(config: TaskStatusConfig): PluginTaskStatusHandle;
    registerSidebarPanel(config: SidebarPanelConfig): void;
    registerCommand(config: CommandConfig): void;
    registerPage(config: PageConfig): void;
    registerFileViewer(config: FileViewerConfig): void;
    registerSlashCommand(config: SlashCommandConfig): void;
    registerContextMenuItem(config: ContextMenuItemConfig): void;
    registerToolbarButton(config: ToolbarButtonConfig): void;
    registerSidebarButton(config: SidebarButtonConfig): void;
    registerSettingsPage(config: SettingsPageConfig): void;  // НОВОЕ
    openPluginPage(pageId: string): void;
    openFile(path: FilePath): void;
    openExternalUrl(url: string): void;
    notify(message: string, durationMs?: number): void;
  };

  // === Редактор ===
  editor: {
    captureActiveSession(): Promise<EditorSession | null>;
    openSession(path: FilePath): Promise<EditorSession>;
    listKinds(): EditorKindInfo[];
    getCapabilities(kind: string): EditorKindCapabilities;
    mount(container: HTMLElement, config: EditorMountConfig): Promise<EditorHandle>;
  };

  // === События ===
  events: {
    on<TEvent extends keyof PluginEventMap>(
      event: TEvent,
      callback: (payload: PluginEventMap[TEvent]) => void | Promise<void>,
    ): () => void;
  };

  // === Хранилище ===
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;  // НОВОЕ
    clear(): Promise<void>;              // НОВОЕ
  };

  // === Настройки ===
  settings: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    getAll(): Promise<Record<string, unknown>>;
    set(key: string, value: unknown): Promise<void>;
    onChange(callback: (event: PluginSettingChangeEvent) => void | Promise<void>): () => void;
  };
}
```

## 6. Отличия v4 → v5

| Возможность | v4 | v5 |
|------------|----|----|
| Хуки жизненного цикла | ❌ Нет | ✅ `onLoad`, `onUnload`, `onSettingsChange`, `onWorkspaceOpen` |
| Branded-типы путей | ❌ `string` | ✅ `FilePath`, `DirPath` |
| Межплагинное взаимодействие | ❌ Нет | ✅ `api.plugins.send/on/respond` |
| Кастомный UI настроек | ❌ Нет | ✅ `registerSettingsPage` |
| `fs.exists()` | ❌ Нет | ✅ Есть |
| `fs.stat()` | ❌ Нет | ✅ Есть |
| `fs.safePath()` | ❌ Нет | ✅ Есть |
| `storage.delete()` | ❌ Нет | ✅ Есть |
| `storage.clear()` | ❌ Нет | ✅ Есть |
| `search.query()` | ❌ Нет | ✅ Есть |
| Генерики в `storage.get<T>()` | ✅ Есть | ✅ Улучшены |

## 7. Обратная совместимость

- Плагины v4 будут работать с предупреждением о депрекации
- Переходник v4→v5 автоматически оборачивает старый API в новый формат
- Миграционный гайд будет предоставлен для разработчиков плагинов
