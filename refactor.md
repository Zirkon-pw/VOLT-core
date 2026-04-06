# VOLT Architecture Refactoring Plan

> **Goal:** Complete architectural redesign with clear separation of concerns, minimal kernel, plugin-first extensibility, and standardized design system.

---

## Table of Contents

1. [Current Architecture Problems](#1-current-architecture-problems)
2. [Target Architecture Principles](#2-target-architecture-principles)
3. [Backend (Go) — New Architecture](#3-backend-go--new-architecture)
4. [Frontend (React/TypeScript) — New Architecture](#4-frontend-reacttypescript--new-architecture)
5. [Plugin API v5](#5-plugin-api-v5)
6. [Design System Standardization](#6-design-system-standardization)
7. [Complete File Migration Map](#7-complete-file-migration-map)
8. [Wails Bridge API Changes](#8-wails-bridge-api-changes)
9. [Migration Strategy — Big Bang](#9-migration-strategy--big-bang)
10. [Post-Refactor Directory Structure](#10-post-refactor-directory-structure)

---

## 1. Current Architecture Problems

### 1.1 Backend (Go)

| Problem | Description |
|---------|-------------|
| **No clear domain layer** | `core/` contains entities and repository interfaces, but there are no domain services, aggregates, or business rules. The "domain" is just data structs. |
| **Commands are application logic but mixed with infrastructure** | `commands/` contains use-case logic that directly calls infrastructure (filesystem, runtime). There's no application service layer mediating between domain and infrastructure. |
| **Handlers know too much** | `interfaces/wailshandler/` has 9 handlers, each directly calling `commands.Manager`. Handlers also handle error localization, mixing concerns. |
| **Link previews and image handling in backend** | These are presentation-layer concerns. The backend should expose primitives (read file, open URL), not resolve YouTube embeds or convert images to base64. |
| **Vault management is a backend command** | Vault list/create/delete is orchestration logic that belongs on the frontend. The backend should only provide filesystem primitives. |
| **Settings are backend commands** | `getLocalization`, `setLocale` are backend commands. Settings should be a frontend feature with backend KV persistence. |

### 1.2 Frontend (React/TypeScript)

| Problem | Description |
|---------|-------------|
| **No clear kernel boundary** | Everything is in `widgets/`, `entities/`, `features/` with no explicit "kernel" vs. "plugin" distinction. The editor, file tree, tabs, search, and plugin system are all equally weighted. |
| **Editor features are monolithic** | `editor-panel/` contains Tiptap setup, extensions, auto-save, image handling, find-in-file, TOC, slash commands, plugin sessions — all in one directory with internal subfolders but no architectural separation. |
| **File tree is hardcoded in kernel** | The file tree sidebar is a core widget, but it should be a plugin (user chose this). Same with search. |
| **Plugin registry is an entity store** | `entities/plugin/model/pluginRegistry.ts` mixes plugin UI registrations with plugin lifecycle. No clear separation between plugin kernel (loading, sandboxing) and plugin features (registrations). |
| **No workspace manager abstraction** | `WorkspaceShell.tsx` is a monolithic component. There's no explicit "WorkspaceManager" that manages workspace lifecycle, pane layout, plugin toolbar buttons, etc. |
| **Image handling and link previews are backend calls** | `imageApi.ts` and `linkPreviewApi.ts` call backend handlers. These should be frontend services using basic backend primitives. |

### 1.3 Plugin API

| Problem | Description |
|---------|-------------|
| **No lifecycle hooks** | Plugins execute via `new Function('api', source)` with no `onLoad`, `onUnload`, `onSettingsChange` hooks. Cleanup is manual and error-prone. |
| **TypeScript types are loose** | `VoltPluginAPI` interface is comprehensive but lacks generics, stricter return types, and better IDE autocomplete for plugin developers. |
| **No inter-plugin communication** | Plugins cannot safely communicate with each other. |
| **Plugin settings are auto-generated only** | Plugins cannot render custom settings UI. |

### 1.4 Design System

| Problem | Description |
|---------|-------------|
| **60+ CSS tokens but no enforcement** | `themeRegistry.ts` defines tokens, but components can (and do) use hardcoded colors, spacing, and border-radius values outside the token system. |
| **UI components are inconsistent** | `shared/ui/` has 12 components (button, text-input, select, toggle, modal, etc.) but they don't all follow the same spacing, border-radius, hover state, or focus ring patterns. |
| **No spacing scale** | There's no `--spacing-xs`, `--spacing-sm`, etc. token. Components use arbitrary `px` and `rem` values. |
| **No border-radius scale** | Components use arbitrary `border-radius` values (4px, 6px, 8px, 12px) with no systematic scale. |
| **No lint enforcement** | No ESLint or stylelint rules prevent hardcoded values. |

---

## 2. Target Architecture Principles

### 2.1 Backend (Go) — "OS Layer"

The backend is **only** responsible for:
- **Filesystem operations** — read, write, list, create, delete, rename files/directories
- **Process management** — spawn, monitor, cancel OS processes (for plugins)
- **System dialogs** — open file/folder picker dialogs
- **Wails bridge** — expose the above as Wails-callable methods
- **KV persistence** — raw key-value store for frontend settings, plugin data, vault list

**Everything else moves to the frontend** (as kernel features or plugins).

### 2.2 Frontend — Minimal Kernel + Plugins

The frontend kernel is **minimal**:
- **Editor engine** — Tiptap core, markdown serialization, editor session management
- **Plugin system** — plugin loading, sandboxed API, event bus, lifecycle management
- **Workspace manager** — workspace lifecycle, pane layout, tab management
- **App shell** — routing, theme provider, i18n provider, error boundary

**Everything else is a plugin** (built-in or user-installed):
- File tree sidebar
- Search & command palette
- Image handling service
- Link preview service
- Vault management
- Settings pages
- Breadcrumbs
- File tabs

### 2.3 Plugin API v5

- **Lifecycle hooks**: `onLoad()`, `onUnload()`, `onSettingsChange()`, `onWorkspaceOpen()`
- **Stricter TypeScript types**: Generics, branded types, better IDE autocomplete
- **Inter-plugin communication**: Safe message-passing between plugins
- **Custom settings UI**: Plugins can optionally render their own settings UI

### 2.4 Design System

- **Strict design tokens**: Colors, spacing, typography, border-radius, shadows — all tokenized
- **Unified UI components**: All 12+ components follow the same token-based design language
- **Lint enforcement**: ESLint + stylelint rules prevent hardcoded values
- **Theme parity**: Light and dark themes use identical token structure

---

## 3. Backend (Go) — New Architecture

### 3.1 Layer Structure

```
backend/
├── domain/                    # Domain entities, value objects, domain services, errors
│   ├── file/
│   │   ├── entity.go          # FileEntry (unchanged)
│   │   ├── errors.go          # Domain errors (unchanged)
│   │   └── repository.go      # FileRepository interface (unchanged)
│   ├── process/               # NEW: Process domain
│   │   ├── entity.go          # ProcessHandle, ProcessConfig
│   │   ├── errors.go
│   │   └── repository.go      # ProcessRepository interface
│   ├── dialog/                # NEW: Dialog domain
│   │   ├── entity.go          # DialogConfig, DialogResult
│   │   └── repository.go      # DialogRepository interface
│   └── storage/               # NEW: KV storage domain
│       ├── entity.go          # KVEntry
│       └── repository.go      # KVRepository interface
│
├── application/               # Application services, use cases, DTOs
│   ├── file/
│   │   ├── service.go         # FileApplicationService (orchestrates FileRepository)
│   │   ├── dto.go             # ReadRequest, WriteRequest, ListTreeRequest, etc.
│   │   └── errors.go          # Application-level errors
│   ├── process/
│   │   ├── service.go         # ProcessApplicationService
│   │   ├── dto.go
│   │   └── errors.go
│   ├── dialog/
│   │   ├── service.go         # DialogApplicationService
│   │   ├── dto.go
│   │   └── errors.go
│   └── storage/
│       ├── service.go         # StorageApplicationService
│       ├── dto.go
│       └── errors.go
│
├── infrastructure/            # Concrete implementations
│   ├── filesystem/
│   │   └── file_repository.go # OS filesystem impl (moved from old infrastructure/)
│   ├── process/
│   │   └── process_repository.go # os/exec wrapper
│   ├── dialog/
│   │   └── dialog_repository.go # Wails runtime dialogs
│   ├── storage/
│   │   ├── kv_repository.go   # JSON file-based KV store
│   │   └── stores/
│   │       ├── volt_store.go      # ~/.volt/volts.json
│   │       └── settings_store.go  # ~/.volt/settings.json
│   └── wails/
│       └── runtime.go         # Wails runtime bridge (events, logging)
│
├── interfaces/                # Wails-exposed API surface
│   ├── file_handler.go        # FileHandler (Read, Write, ListTree, CreateFile, CreateDir, Delete, Rename)
│   ├── process_handler.go     # ProcessHandler (Start, Cancel)
│   ├── dialog_handler.go      # DialogHandler (SelectDirectory, PickFiles, PickImage)
│   ├── storage_handler.go     # StorageHandler (Get, Set, Delete, List)
│   └── lifecycle.go           # App lifecycle hooks (Startup, DomReady, BeforeClose)
│
└── bootstrap/
    └── container.go           # DI composition root
```

### 3.2 What Changes

| Old Location | New Location | Change |
|-------------|-------------|--------|
| `core/file/` | `backend/domain/file/` | Move, no changes |
| `core/volt/` | **DELETED** | Volt entity moves to frontend plugin |
| `core/note/` | **DELETED** | Note entity is just a FileEntry with `.md` extension — no separate domain needed |
| `core/search/` | **DELETED** | Search moves to frontend plugin |
| `core/settings/` | **SPLIT** | Localization service moves to frontend; KV storage stays as `backend/domain/storage/` |
| `core/plugin/` | **DELETED** | Plugin management moves entirely to frontend |
| `commands/file/` | `backend/application/file/` | Commands become methods on `FileApplicationService` |
| `commands/volt/` | **DELETED** | Moves to frontend vault management plugin |
| `commands/note/` | **DELETED** | Note creation is just `file.Create()` with `.md` extension |
| `commands/search/` | **DELETED** | Moves to frontend search plugin |
| `commands/plugin/` | **DELETED** | Moves entirely to frontend |
| `commands/settings/` | **DELETED** | Moves to frontend settings feature |
| `commands/system/` | **SPLIT** | Dialogs → `backend/application/dialog/`; Process → `backend/application/process/`; Images → **DELETED** (moves to frontend); Link previews → **DELETED** (moves to frontend); Asset copy → **DELETED** (frontend service) |
| `infrastructure/filesystem/` | `backend/infrastructure/filesystem/` | Move, no changes |
| `infrastructure/persistence/` | `backend/infrastructure/storage/` | Move, rename |
| `infrastructure/runtime/wails/` | `backend/infrastructure/wails/` | Move, rename |
| `interfaces/wailshandler/` | **SPLIT** | 9 handlers → 4 handlers (file, process, dialog, storage) |

### 3.3 Backend Wails API Surface (After)

| Handler | Methods | Purpose |
|---------|---------|---------|
| `FileHandler` | `Read(path)`, `Write(path, content)`, `ListTree(root)`, `CreateFile(path)`, `CreateDirectory(path)`, `Delete(path)`, `Rename(oldPath, newPath)` | Filesystem CRUD |
| `ProcessHandler` | `Start(config)`, `Cancel(id)` | OS process management |
| `DialogHandler` | `SelectDirectory()`, `PickFiles(accept, multiple)`, `PickImage()` | System dialogs |
| `StorageHandler` | `Get(namespace, key)`, `Set(namespace, key, value)`, `Delete(namespace, key)`, `List(namespace)` | KV persistence |

**Total handlers: 4** (down from 9)

---

## 4. Frontend (React/TypeScript) — New Architecture

### 4.1 Layer Structure

```
frontend/src/
├── app/                       # Application bootstrap (unchanged concept)
│   ├── App.tsx
│   ├── providers/
│   │   ├── ErrorBoundary.tsx
│   │   ├── I18nProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── routes/
│   │   └── AppRouter.tsx
│   └── styles/
│       └── globals.scss
│
├── kernel/                    # NEW: Frontend kernel (was entities/ + widgets/ core)
│   ├── editor/                # Editor engine — split by feature
│   │   ├── core/              # Tiptap setup, editor instance management
│   │   │   ├── EditorEngine.ts
│   │   │   ├── EditorInstance.ts
│   │   │   └── EditorConfig.ts
│   │   ├── extensions/        # Tiptap extensions (each is a separate module)
│   │   │   ├── slash-command/
│   │   │   ├── code-block/
│   │   │   ├── table/
│   │   │   ├── math-block/
│   │   │   ├── embed-block/
│   │   │   └── find-in-file/
│   │   ├── serialization/     # Markdown parse/serialize
│   │   │   ├── MarkdownParser.ts
│   │   │   └── MarkdownSerializer.ts
│   │   ├── auto-save/         # Auto-save feature (separate module)
│   │   │   ├── AutoSaveService.ts
│   │   │   └── DirtyTracker.ts
│   │   ├── image-handling/    # Image drag-drop, paste, resolution (separate module)
│   │   │   ├── ImageDropHandler.ts
│   │   │   ├── ImagePasteHandler.ts
│   │   │   └── ImageResolver.ts
│   │   ├── sessions/          # Editor session management
│   │   │   ├── EditorSessionManager.ts
│   │   │   ├── EditorSession.ts
│   │   │   └── AnchorManager.ts
│   │   ├── toc/               # Table of contents (separate module)
│   │   │   └── TocGenerator.ts
│   │   └── ui/                # Editor UI components
│   │       ├── EditorPanel.tsx
│   │       └── MarkdownEditorSurface.tsx
│   │
│   ├── plugin-system/         # Plugin kernel (loading, sandboxing, lifecycle)
│   │   ├── loader/
│   │   │   ├── PluginLoader.ts       # Loads plugins via new Function('api', source)
│   │   │   ├── PluginSandbox.ts      # Sandboxed execution context
│   │   │   └── PluginValidator.ts    # Manifest validation
│   │   ├── api/
│   │   │   ├── PluginApiFactory.ts   # Creates sandboxed API per plugin
│   │   │   ├── PluginApiV5.ts        # TypeScript types for VoltPluginAPI v5
│   │   │   └── PermissionChecker.ts  # Permission enforcement
│   │   ├── events/
│   │   │   ├── PluginEventBus.ts     # Tracked event subscriptions
│   │   │   └── InterPluginMessenger.ts # NEW: Safe inter-plugin communication
│   │   ├── lifecycle/
│   │   │   ├── PluginLifecycleManager.ts # NEW: onLoad, onUnload, onSettingsChange
│   │   │   └── PluginCleanup.ts
│   │   ├── registry/
│   │   │   ├── PluginRegistry.ts     # UI registrations
│   │   │   └── PluginSettingsRegistry.ts
│   │   └── ui/
│   │       ├── PluginPrompt.tsx
│   │       ├── PluginPermissionDialog.tsx
│   │       └── PluginTaskStatus.tsx
│   │
│   ├── workspace/             # Workspace manager
│   │   ├── core/
│   │   │   ├── WorkspaceManager.ts   # Workspace lifecycle
│   │   │   ├── Workspace.ts          # Workspace entity
│   │   │   └── WorkspaceStore.ts     # Zustand store
│   │   ├── panes/
│   │   │   ├── PaneLayout.ts         # Pane layout config
│   │   │   ├── PaneSplitter.tsx      # Split pane UI
│   │   │   └── PaneStore.ts          # Zustand store
│   │   ├── tabs/
│   │   │   ├── TabManager.ts         # Tab lifecycle
│   │   │   ├── TabStore.ts           # Zustand store (file tabs + plugin tabs)
│   │   │   └── TabBar.tsx            # Tab bar UI
│   │   └── ui/
│   │       └── WorkspaceShell.tsx    # Main workspace layout
│   │
│   └── navigation/            # Navigation history
│       ├── NavigationStore.ts
│       └── NavigationHistory.ts
│
├── plugins/                   # NEW: Built-in plugins (formerly widgets/ + features/ + some entities/)
│   ├── file-tree/             # File tree sidebar plugin
│   │   ├── manifest.json      # Plugin manifest (built-in)
│   │   ├── FileTreePlugin.ts  # Plugin entry point with lifecycle hooks
│   │   ├── FileTreeService.ts # File tree data fetching
│   │   ├── FileTreeStore.ts   # Zustand store
│   │   ├── FileTreeView.tsx   # Tree component
│   │   ├── FileTreeItem.tsx
│   │   ├── DragDropHandler.ts
│   │   ├── InlineRename.tsx
│   │   └── ContextMenu.tsx
│   │
│   ├── search/                # Search & command palette plugin
│   │   ├── manifest.json
│   │   ├── SearchPlugin.ts
│   │   ├── SearchService.ts   # Calls backend FileHandler.ListTree + content search
│   │   ├── SearchStore.ts
│   │   ├── SearchPopup.tsx
│   │   ├── CommandPalette.tsx
│   │   └── SearchProvider.ts  # Registers as text provider
│   │
│   ├── image-service/         # Image handling service (plugin)
│   │   ├── manifest.json
│   │   ├── ImageService.ts    # Image picking, base64, copy, save
│   │   └── ImageStore.ts
│   │
│   ├── link-preview/          # Link preview service (plugin)
│   │   ├── manifest.json
│   │   ├── LinkPreviewService.ts # URL preview resolution
│   │   └── LinkPreviewCard.tsx
│   │
│   ├── vault-manager/         # Vault management plugin
│   │   ├── manifest.json
│   │   ├── VaultManager.ts    # Vault CRUD via backend StorageHandler
│   │   ├── VaultStore.ts
│   │   └── VaultList.tsx
│   │
│   ├── settings/              # Settings pages plugin
│   │   ├── manifest.json
│   │   ├── SettingsPlugin.ts
│   │   ├── SettingsStore.ts   # App settings (theme, locale, shortcuts)
│   │   ├── SettingsPage.tsx
│   │   ├── sections/
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── ShortcutSettings.tsx
│   │   │   ├── PluginCatalog.tsx
│   │   │   └── AboutPage.tsx
│   │   └── PluginSettingsPage.tsx
│   │
│   ├── breadcrumbs/           # Breadcrumbs plugin
│   │   ├── manifest.json
│   │   ├── Breadcrumbs.tsx
│   │   └── BreadcrumbStore.ts
│   │
│   └── file-viewer/           # File view resolution plugin
│       ├── manifest.json
│       ├── FileViewHost.tsx   # Renders file content based on type
│       ├── RawTextEditor.tsx
│       └── ImageViewer.tsx
│
├── shared/                    # Shared utilities (refactored)
│   ├── api/                   # Wails API client wrappers (updated for new backend API)
│   │   ├── wails.ts
│   │   ├── wailsWithError.ts
│   │   ├── file/
│   │   │   └── fileApi.ts     # Updated for new FileHandler
│   │   ├── process/
│   │   │   └── processApi.ts  # NEW
│   │   ├── dialog/
│   │   │   └── dialogApi.ts   # NEW
│   │   └── storage/
│   │       └── storageApi.ts  # NEW
│   │
│   ├── ui/                    # Unified UI kit (redesigned)
│   │   ├── button/
│   │   ├── text-input/
│   │   ├── textarea/
│   │   ├── select/
│   │   ├── toggle/
│   │   ├── modal/
│   │   ├── context-menu/
│   │   ├── color-picker/
│   │   ├── number-input/
│   │   ├── spinner/
│   │   ├── icon/
│   │   ├── volt-logo/
│   │   ├── volt-card/
│   │   ├── toast/
│   │   ├── badge/             # NEW
│   │   ├── tooltip/           # NEW
│   │   ├── divider/           # NEW
│   │   └── skeleton/          # NEW
│   │
│   ├── design-tokens/         # NEW: Design token system
│   │   ├── tokens.scss        # All CSS custom properties
│   │   ├── spacing.scss       # Spacing scale
│   │   ├── typography.scss    # Typography scale
│   │   ├── colors.scss        # Color palette
│   │   ├── radii.scss         # Border radius scale
│   │   ├── shadows.scss       # Shadow scale
│   │   └── z-index.scss       # Z-index scale
│   │
│   ├── lib/
│   │   ├── hotkeys/
│   │   ├── windowing/
│   │   ├── store/
│   │   ├── fileTree.ts
│   │   ├── fileTypes.ts
│   │   ├── fileIcons.ts
│   │   ├── remoteUrl.ts
│   │   └── useDoubleShift.ts
│   │
│   ├── config/
│   │   ├── theme/
│   │   │   └── themeRegistry.ts  # Updated for new token system
│   │   └── constants.ts
│   │
│   └── i18n/
│
├── pages/                     # Pages (simplified — most logic moves to plugins)
│   ├── home/
│   │   └── HomePage.tsx       # Vault list (uses vault-manager plugin)
│   ├── workspace/
│   │   ├── WorkspacePage.tsx  # Workspace container (uses kernel workspace manager)
│   │   └── PluginRoutePage.tsx
│   └── window/
│       ├── DetachedFileWindow.tsx
│       └── DetachedSidebarWindow.tsx
│
└── types/                     # NEW: Global TypeScript types
    ├── plugin-api-v5.ts
    ├── editor.ts
    ├── workspace.ts
    └── design-tokens.ts
```

### 4.2 What Changes

| Old Location | New Location | Change |
|-------------|-------------|--------|
| `entities/volt/` | `plugins/vault-manager/` | Moves to plugin |
| `entities/workspace/` | `kernel/workspace/` | Moves to kernel, refactored |
| `entities/tab/` | `kernel/workspace/tabs/` | Moves to kernel tab manager |
| `entities/file-tree/` | `plugins/file-tree/` | Moves to plugin |
| `entities/navigation/` | `kernel/navigation/` | Moves to kernel |
| `entities/editor-session/` | `kernel/editor/sessions/` | Moves to kernel editor |
| `entities/workspace-view/` | `kernel/workspace/panes/` | Moves to kernel workspace |
| `entities/app-settings/` | `plugins/settings/` | Moves to plugin |
| `entities/plugin/` | **SPLIT** → `kernel/plugin-system/` + `plugins/` | Registry splits |
| `widgets/workspace-shell/` | **SPLIT** → `kernel/workspace/ui/` + `plugins/` | Shell → kernel, sub-widgets → plugins |
| `widgets/workspace-shell/editor-panel/` | `kernel/editor/` | Moves to kernel editor, split by feature |
| `widgets/workspace-shell/file-tree/` | `plugins/file-tree/` | Moves to plugin |
| `widgets/workspace-shell/file-tabs/` | `kernel/workspace/tabs/` | Moves to kernel tab manager |
| `widgets/workspace-shell/workspace-toolbar/` | `kernel/workspace/ui/` | Moves to kernel |
| `widgets/workspace-shell/file-view-host/` | `plugins/file-viewer/` | Moves to plugin |
| `widgets/workspace-shell/image-viewer/` | `plugins/image-service/` | Moves to plugin |
| `widgets/workspace-shell/raw-text-editor/` | `plugins/file-viewer/` | Moves to plugin |
| `widgets/workspace-shell/breadcrumbs/` | `plugins/breadcrumbs/` | Moves to plugin |
| `features/workspace-search/` | `plugins/search/` | Moves to plugin |
| `features/plugin-prompt/` | `kernel/plugin-system/ui/` | Moves to kernel plugin system |
| `features/plugin-permission/` | `kernel/plugin-system/ui/` | Moves to kernel plugin system |
| `features/plugin-task-status/` | `kernel/plugin-system/ui/` | Moves to kernel plugin system |
| `features/shortcut-settings/` | `plugins/settings/` | Moves to plugin |
| `shared/lib/plugin-runtime/` | **SPLIT** → `kernel/plugin-system/` | Moves to kernel plugin system |
| `shared/api/` | `shared/api/` | Updated for new backend API |
| `shared/ui/` | `shared/ui/` | Redesigned with unified design tokens |
| `shared/config/theme/` | `shared/design-tokens/` + `shared/config/theme/` | Token system extracted |
| `pages/settings/` | `plugins/settings/` | Moves to plugin |
| `pages/home/` | `pages/home/` | Stays, but uses vault-manager plugin |

---

## 5. Plugin API v5

### 5.1 Lifecycle Hooks

```typescript
// Plugin main.js — v5 structure
export function onLoad(api) {
  // Called when plugin is loaded, before any UI is rendered
  // Return cleanup function or register lifecycle handlers
  api.events.on('workspace:path-renamed', handlePathRename);
  
  return () => {
    // Cleanup
  };
}

export function onUnload(api) {
  // Called when plugin is being unloaded
  // Good for final cleanup, saving state
}

export function onSettingsChange(api, event) {
  // Called when any plugin setting changes
  // event: { key, value, values }
}

export function onWorkspaceOpen(api, workspace) {
  // Called when a workspace is opened
  // workspace: { voltId, voltPath, rootPath }
}
```

### 5.2 Stricter TypeScript Types

```typescript
// Before (v4)
api.fs.read(path: string): Promise<string>;

// After (v5) — branded types for path safety
declare const __brand: unique symbol;
type Branded<T, B> = T & { [__brand]: B };
type FilePath = Branded<string, 'FilePath'>;
type DirPath = Branded<string, 'DirPath'>;

interface PluginFileSystemAPI {
  read(path: FilePath): Promise<string>;
  write(path: FilePath, content: string): Promise<void>;
  create(path: FilePath, content?: string): Promise<void>;
  list(dirPath?: DirPath): Promise<FileEntry[]>;
}
```

### 5.3 Inter-Plugin Communication

```typescript
// Plugin A sends a message
api.plugins.send('obsidian:vault:sync', { action: 'import', paths: [...] });

// Plugin B listens
api.plugins.on('obsidian:vault:sync', (payload) => {
  // Handle sync request
});

// Plugin B responds
api.plugins.respond('obsidian:vault:sync', requestId, { status: 'ok' });
```

### 5.4 Custom Settings UI

```typescript
// Plugin manifest — optional custom settings renderer
{
  "settings": {
    "customUI": true,  // If true, plugin renders its own settings UI
    "sections": [...]  // Still used for auto-generated UI if customUI is false
  }
}

// Plugin registers custom settings UI
api.ui.registerSettingsPage({
  id: 'my-plugin-settings',
  title: 'My Plugin',
  render: (container: HTMLElement) => {
    // Custom React or vanilla JS UI
  },
  cleanup: () => {}
});
```

### 5.5 Full VoltPluginAPI v5 Interface

```typescript
export interface VoltPluginAPI {
  // === Filesystem ===
  fs: {
    read(path: FilePath): Promise<string>;
    write(path: FilePath, content: string): Promise<void>;
    create(path: FilePath, content?: string): Promise<void>;
    list(dirPath?: DirPath): Promise<FileEntry[]>;
    exists(path: FilePath): Promise<boolean>;           // NEW
    stat(path: FilePath): Promise<FileStat>;            // NEW
  };

  // === Workspace ===
  workspace: {
    getActivePath(): FilePath | null;
    getRootPath(): DirPath;
    onPathRenamed(callback: (oldPath: FilePath, newPath: FilePath) => void): () => void;
  };

  // === Search ===
  search: {
    registerTextProvider(config: SearchFileTextProvider): void;
    query(text: string, options?: SearchOptions): Promise<SearchResult[]>; // NEW
  };

  // === Assets ===
  assets: {
    pickImage(): Promise<FilePath>;
    pickFile(config?: PluginFilePickerConfig): Promise<FilePath | FilePath[] | null>;
    copyAsset(sourcePath: FilePath, targetDir?: DirPath): Promise<FilePath>;
    copyImage(sourcePath: FilePath, targetDir?: DirPath): Promise<FilePath>;
    saveImageBase64(fileName: string, base64: string, targetDir?: DirPath): Promise<FilePath>;
    readImageDataUrl(path: FilePath): Promise<string>;
  };

  // === Process ===
  process: {
    start(config: ProcessStartConfig): Promise<DesktopProcessHandle>;
  };

  // === Plugins (NEW) ===
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
    registerSettingsPage(config: SettingsPageConfig): void;  // NEW
    openPluginPage(pageId: string): void;
    openFile(path: FilePath): void;
    openExternalUrl(url: string): void;
    notify(message: string, durationMs?: number): void;
  };

  // === Editor ===
  editor: {
    captureActiveSession(): Promise<EditorSession | null>;
    openSession(path: FilePath): Promise<EditorSession>;
    listKinds(): EditorKindInfo[];
    getCapabilities(kind: string): EditorKindCapabilities;
    mount(container: HTMLElement, config: EditorMountConfig): Promise<EditorHandle>;
  };

  // === Events ===
  events: {
    on<TEvent extends keyof PluginEventMap>(
      event: TEvent,
      callback: (payload: PluginEventMap[TEvent]) => void | Promise<void>,
    ): () => void;
  };

  // === Storage ===
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;  // NEW
    clear(): Promise<void>;              // NEW
  };

  // === Settings ===
  settings: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    getAll(): Promise<Record<string, unknown>>;
    set(key: string, value: unknown): Promise<void>;
    onChange(callback: (event: PluginSettingChangeEvent) => void | Promise<void>): () => void;
  };
}
```

---

## 6. Design System Standardization

### 6.1 Design Tokens

All CSS custom properties are defined in `shared/design-tokens/tokens.scss`:

#### Color Palette

```scss
// Primary colors
--color-accent: #239dad;
--color-accent-hover: #1f8795;
--color-accent-text: #f7fbfc;

// Semantic colors
--color-success: #4f7d72;
--color-warning: #9b7a42;
--color-error: #a35d5a;
--color-danger: #a35d5a;
--color-danger-bg: rgba(163, 93, 90, 0.12);

// Icon colors (named, not hex)
--color-icon: #7a838b;
--color-icon-coral: #b97969;
--color-icon-sage: #5f8778;
--color-icon-sky: #5d7f9f;
--color-icon-butter: #9d8547;
--color-icon-plum: #7b7195;
--color-icon-olive: #78804f;
--color-icon-slate: #73828e;

// Tints
--color-tint-sage: #dde7e0;
--color-tint-blue: #dce8ee;
--color-tint-lilac: #e4e0ec;
--color-tint-butter: #ebe4cf;
--color-tint-rose: #ece1e2;
```

#### Spacing Scale

```scss
--spacing-0: 0;
--spacing-2xs: 0.125rem;  // 2px
--spacing-xs: 0.25rem;    // 4px
--spacing-sm: 0.5rem;     // 8px
--spacing-md: 0.75rem;    // 12px
--spacing-lg: 1rem;       // 16px
--spacing-xl: 1.25rem;    // 20px
--spacing-2xl: 1.5rem;    // 24px
--spacing-3xl: 2rem;      // 32px
--spacing-4xl: 2.5rem;    // 40px
--spacing-5xl: 3rem;      // 48px
--spacing-6xl: 4rem;      // 64px
```

#### Typography Scale

```scss
--text-xs: 0.75rem;      // 12px
--text-sm: 0.875rem;     // 14px
--text-base: 1rem;       // 16px
--text-lg: 1.125rem;     // 18px
--text-xl: 1.25rem;      // 20px
--text-2xl: 1.5rem;      // 24px
--text-3xl: 1.875rem;    // 30px
--text-4xl: 2.25rem;     // 36px

--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
```

#### Border Radius Scale

```scss
--radius-sm: 0.25rem;   // 4px — buttons, inputs
--radius-md: 0.5rem;    // 8px — cards, panels
--radius-lg: 0.75rem;   // 12px — modals, dialogs
--radius-xl: 1rem;      // 16px — large containers
--radius-full: 9999px;  — pills, badges
```

#### Shadow Scale

```scss
--shadow-sm: 0 1px 2px rgba(31, 35, 40, 0.04);
--shadow-md: 0 8px 24px rgba(31, 35, 40, 0.06);
--shadow-lg: 0 18px 48px rgba(31, 35, 40, 0.08);
--shadow-popup: 0 18px 40px rgba(31, 35, 40, 0.12);
--shadow-floating: 0 10px 26px rgba(31, 35, 40, 0.12);
```

#### Z-Index Scale

```scss
--z-dropdown: 100;
--z-sticky: 200;
--z-overlay: 300;
--z-modal: 400;
--z-toast: 500;
--z-tooltip: 600;
```

### 6.2 UI Component Rules

Every component in `shared/ui/` must:

1. **Use only design tokens** for colors, spacing, typography, border-radius, shadows
2. **No hardcoded hex values** — use `var(--color-*)` tokens
3. **No arbitrary px/rem values** — use `var(--spacing-*)` tokens
4. **Consistent focus ring** — `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`
5. **Consistent hover states** — `background-color: var(--color-bg-hover); transition: all 0.15s ease;`
6. **Consistent disabled states** — `opacity: 0.5; pointer-events: none;`
7. **Consistent sizing** — use `--spacing-lg` for padding, `--radius-sm` for border-radius

### 6.3 Lint Enforcement

```javascript
// .stylelintrc.js
module.exports = {
  rules: {
    'color-no-hex': true,
    'custom-property-pattern': '^--(color|spacing|radius|shadow|z|font|text|leading|tracking)-',
    'declaration-property-value-disallowed-list': {
      'border-radius': ['^[0-9]+px$', '^[0-9]+rem$'], // Must use tokens
      'padding': ['^[0-9]+px$', '^[0-9]+rem$'],
      'margin': ['^[0-9]+px$', '^[0-9]+rem$'],
      'color': ['^#[0-9a-fA-F]+$'],
      'background-color': ['^#[0-9a-fA-F]+$'],
    },
  },
};

// eslint-plugin-volt (custom)
// Disallows hardcoded colors in JS/TSX:
// - No `color: '#239dad'` in inline styles
// - No `backgroundColor: '#fdfcf8'` in style objects
// - Must use CSS tokens or theme tokens
```

### 6.4 New UI Components

| Component | Purpose |
|-----------|---------|
| `Badge` | Status indicators, tags |
| `Tooltip` | Hover tooltips for icons, buttons |
| `Divider` | Horizontal/vertical separators |
| `Skeleton` | Loading placeholders |

---

## 7. Complete File Migration Map

### 7.1 Backend (Go)

| Source File | Destination | Action |
|------------|-------------|--------|
| `core/file/entity.go` | `backend/domain/file/entity.go` | Move |
| `core/file/errors.go` | `backend/domain/file/errors.go` | Move |
| `core/file/repository.go` | `backend/domain/file/repository.go` | Move |
| `core/volt/entity.go` | **DELETED** | Replaced by frontend plugin |
| `core/volt/errors.go` | **DELETED** | Replaced by frontend plugin |
| `core/volt/repository.go` | **DELETED** | Replaced by frontend plugin |
| `core/note/entity.go` | **DELETED** | Note is just a `.md` file |
| `core/search/entity.go` | **DELETED** | Moves to frontend plugin |
| `core/settings/entity.go` | **SPLIT** | Settings entity → frontend; KV → `backend/domain/storage/` |
| `core/settings/repository.go` | **SPLIT** | Settings repo → frontend; KV → `backend/domain/storage/` |
| `core/settings/localization.go` | `frontend/src/shared/i18n/` | Moves to frontend |
| `core/settings/locales/en.json` | `frontend/src/shared/i18n/locales/en.json` | Moves to frontend |
| `core/settings/locales/ru.json` | `frontend/src/shared/i18n/locales/ru.json` | Moves to frontend |
| `core/plugin/entity.go` | **DELETED** | Moves to frontend plugin system |
| `core/plugin/errors.go` | **DELETED** | Moves to frontend plugin system |
| `core/plugin/repository.go` | **DELETED** | Moves to frontend plugin system |
| `commands/file/*.go` | `backend/application/file/service.go` | Merge into service |
| `commands/note/*.go` | **DELETED** | Note creation is `file.Create()` with `.md` |
| `commands/volt/*.go` | **DELETED** | Moves to frontend plugin |
| `commands/search/*.go` | **DELETED** | Moves to frontend plugin |
| `commands/plugin/*.go` | **DELETED** | Moves to frontend plugin system |
| `commands/settings/*.go` | **DELETED** | Moves to frontend plugin |
| `commands/system/runtime.go` | `backend/application/process/service.go` | Refactor |
| `commands/system/dialogs.go` | `backend/application/dialog/service.go` | Refactor |
| `commands/system/assets.go` | **DELETED** | Moves to frontend plugin |
| `commands/system/images.go` | **DELETED** | Moves to frontend plugin |
| `commands/system/link_preview.go` | **DELETED** | Moves to frontend plugin |
| `commands/system/plugin_process.go` | `backend/application/process/service.go` | Refactor |
| `commands/system/errors.go` | `backend/application/*/errors.go` | Split by domain |
| `commands/manager.go` | `backend/application/manager.go` | Move, update |
| `infrastructure/filesystem/file_repository.go` | `backend/infrastructure/filesystem/file_repository.go` | Move |
| `infrastructure/filesystem/plugin_store.go` | **DELETED** | Moves to frontend plugin system |
| `infrastructure/persistence/local/config_dir.go` | `backend/infrastructure/storage/config_dir.go` | Move |
| `infrastructure/persistence/local/volt_store.go` | `backend/infrastructure/storage/stores/volt_store.go` | Move |
| `infrastructure/persistence/local/settings_store.go` | `backend/infrastructure/storage/stores/settings_store.go` | Move |
| `infrastructure/runtime/wails/runtime.go` | `backend/infrastructure/wails/runtime.go` | Move |
| `interfaces/wailshandler/volt_handler.go` | **DELETED** | Moves to frontend plugin |
| `interfaces/wailshandler/file_handler.go` | `backend/interfaces/file_handler.go` | Move, update |
| `interfaces/wailshandler/note_handler.go` | **DELETED** | Merged into file_handler |
| `interfaces/wailshandler/search_handler.go` | **DELETED** | Moves to frontend plugin |
| `interfaces/wailshandler/plugin_handler.go` | **DELETED** | Moves to frontend plugin system |
| `interfaces/wailshandler/image_handler.go` | **DELETED** | Moves to frontend plugin |
| `interfaces/wailshandler/link_preview_handler.go` | **DELETED** | Moves to frontend plugin |
| `interfaces/wailshandler/settings_handler.go` | **DELETED** | Moves to frontend plugin |
| `interfaces/wailshandler/lifecycle.go` | `backend/interfaces/lifecycle.go` | Move |
| `interfaces/wailshandler/localization_helpers.go` | **DELETED** | Moves to frontend |
| `interfaces/wailshandler/vault_asset_server.go` | `backend/interfaces/vault_asset_server.go` | Move |
| `interfaces/wailshandler/plugin_process.go` | **DELETED** | Moves to backend process handler |
| `bootstrap/container.go` | `backend/bootstrap/container.go` | Move, rewrite |
| `main.go` | `main.go` | Update imports |

### 7.2 Frontend (React/TypeScript)

| Source File | Destination | Action |
|------------|-------------|--------|
| `entities/volt/model/voltStore.ts` | `plugins/vault-manager/VaultStore.ts` | Move |
| `entities/workspace/model/workspaceStore.ts` | `kernel/workspace/WorkspaceStore.ts` | Move |
| `entities/tab/model/tabStore.ts` | `kernel/workspace/tabs/TabStore.ts` | Move |
| `entities/file-tree/model/fileTreeStore.ts` | `plugins/file-tree/FileTreeStore.ts` | Move |
| `entities/navigation/model/navigationStore.ts` | `kernel/navigation/NavigationStore.ts` | Move |
| `entities/editor-session/model/activeFileStore.ts` | `kernel/editor/sessions/EditorSessionManager.ts` | Move, refactor |
| `entities/workspace-view/model/workspaceViewStore.ts` | `kernel/workspace/panes/PaneStore.ts` | Move |
| `entities/app-settings/model/appSettingsStore.ts` | `plugins/settings/SettingsStore.ts` | Move |
| `entities/plugin/model/pluginRegistry.ts` | **SPLIT** → `kernel/plugin-system/registry/PluginRegistry.ts` + `kernel/plugin-system/registry/PluginSettingsRegistry.ts` | Split |
| `entities/plugin/model/pluginLogStore.ts` | `kernel/plugin-system/ui/PluginLogStore.ts` | Move |
| `entities/plugin/model/pluginSettingsStore.ts` | `kernel/plugin-system/registry/PluginSettingsRegistry.ts` | Move |
| `widgets/workspace-shell/WorkspaceShell.tsx` | `kernel/workspace/ui/WorkspaceShell.tsx` | Move |
| `widgets/workspace-shell/sidebar/Sidebar.tsx` | `plugins/file-tree/FileTreeView.tsx` | Move |
| `widgets/workspace-shell/file-tree/` | `plugins/file-tree/` | Move |
| `widgets/workspace-shell/file-tabs/` | `kernel/workspace/tabs/TabBar.tsx` | Move |
| `widgets/workspace-shell/workspace-toolbar/` | `kernel/workspace/ui/Toolbar.tsx` | Move |
| `widgets/workspace-shell/file-view-host/` | `plugins/file-viewer/FileViewHost.tsx` | Move |
| `widgets/workspace-shell/editor-panel/` | **SPLIT** → `kernel/editor/` (by feature) | Split by feature |
| `widgets/workspace-shell/editor-panel/EditorPanel.tsx` | `kernel/editor/ui/EditorPanel.tsx` | Move |
| `widgets/workspace-shell/editor-panel/MarkdownEditorSurface.tsx` | `kernel/editor/ui/MarkdownEditorSurface.tsx` | Move |
| `widgets/workspace-shell/editor-panel/hooks/useEditorSetup.ts` | `kernel/editor/core/EditorEngine.ts` | Merge into engine |
| `widgets/workspace-shell/editor-panel/hooks/useAutoSave.ts` | `kernel/editor/auto-save/AutoSaveService.ts` | Move |
| `widgets/workspace-shell/editor-panel/hooks/useImageResolver.ts` | `kernel/editor/image-handling/ImageResolver.ts` | Move |
| `widgets/workspace-shell/editor-panel/extensions/` | `kernel/editor/extensions/` | Move |
| `widgets/workspace-shell/image-viewer/` | `plugins/image-service/` | Move |
| `widgets/workspace-shell/raw-text-editor/` | `plugins/file-viewer/RawTextEditor.tsx` | Move |
| `widgets/workspace-shell/breadcrumbs/` | `plugins/breadcrumbs/Breadcrumbs.tsx` | Move |
| `features/workspace-search/` | `plugins/search/` | Move |
| `features/plugin-prompt/` | `kernel/plugin-system/ui/PluginPrompt.tsx` | Move |
| `features/plugin-permission/` | `kernel/plugin-system/ui/PluginPermissionDialog.tsx` | Move |
| `features/plugin-task-status/` | `kernel/plugin-system/ui/PluginTaskStatus.tsx` | Move |
| `features/shortcut-settings/` | `plugins/settings/sections/ShortcutSettings.tsx` | Move |
| `shared/lib/plugin-runtime/` | **SPLIT** → `kernel/plugin-system/` | Split |
| `shared/lib/plugin-runtime/pluginLoader.ts` | `kernel/plugin-system/loader/PluginLoader.ts` | Move |
| `shared/lib/plugin-runtime/pluginApi.ts` | `kernel/plugin-system/api/PluginApiV5.ts` | Move, upgrade to v5 |
| `shared/lib/plugin-runtime/pluginApiFactory.ts` | `kernel/plugin-system/api/PluginApiFactory.ts` | Move |
| `shared/lib/plugin-runtime/pluginEventBus.ts` | `kernel/plugin-system/events/PluginEventBus.ts` | Move |
| `shared/lib/plugin-runtime/editorSessionManager.ts` | `kernel/editor/sessions/EditorSessionManager.ts` | Move |
| `shared/lib/plugin-runtime/hostEditorService.tsx` | `kernel/editor/sessions/HostEditorService.tsx` | Move |
| `shared/lib/plugin-runtime/pluginProcessManager.ts` | `kernel/plugin-system/loader/PluginSandbox.ts` | Move |
| `shared/lib/plugin-runtime/fileViewResolution.ts` | `plugins/file-viewer/FileViewResolution.ts` | Move |
| `shared/lib/plugin-runtime/safeExecute.ts` | `kernel/plugin-system/loader/PluginValidator.ts` | Move |
| `shared/lib/plugin-runtime/editorBridge.ts` | `kernel/editor/core/EditorEngine.ts` | Merge |
| `shared/api/file/fileApi.ts` | `shared/api/file/fileApi.ts` | Update for new backend |
| `shared/api/note/noteApi.ts` | **DELETED** | Merged into fileApi |
| `shared/api/search/searchApi.ts` | `plugins/search/SearchService.ts` | Move |
| `shared/api/volt/voltApi.ts` | `plugins/vault-manager/VaultManager.ts` | Move |
| `shared/api/plugin/catalogApi.ts` | `kernel/plugin-system/api/PluginApiV5.ts` | Merge |
| `shared/api/plugin/runtimeHostApi.ts` | `kernel/plugin-system/api/PluginApiV5.ts` | Merge |
| `shared/api/image/imageApi.ts` | `plugins/image-service/ImageService.ts` | Move |
| `shared/api/link-preview/linkPreviewApi.ts` | `plugins/link-preview/LinkPreviewService.ts` | Move |
| `shared/api/settings/settingsApi.ts` | `plugins/settings/SettingsStore.ts` | Move |
| `shared/ui/` | `shared/ui/` | **REDESIGN** — all components updated with tokens |
| `shared/config/theme/themeRegistry.ts` | `shared/design-tokens/` + `shared/config/theme/` | Split |
| `pages/home/HomePage.tsx` | `pages/home/HomePage.tsx` | Update imports |
| `pages/workspace/WorkspacePage.tsx` | `pages/workspace/WorkspacePage.tsx` | Update imports |
| `pages/workspace/PluginRoutePage.tsx` | `pages/workspace/PluginRoutePage.tsx` | Update imports |
| `pages/settings/` | `plugins/settings/` | Move |
| `pages/window/` | `pages/window/` | Update imports |

---

## 8. Wails Bridge API Changes

### 8.1 Before (9 handlers, ~40 methods)

```
VoltHandler:       ListVolts, CreateVolt, CreateVoltInParent, DeleteVolt
FileHandler:       ReadFile, SaveFile, ListTree, CreateFile, CreateDirectory, DeletePath, RenamePath
NoteHandler:       CreateNote
SearchHandler:     SearchFiles
PluginCatalog:     ListPlugins, ImportPlugin, LoadPlugin, TogglePlugin, DeletePlugin, GetPluginsDirectory
PluginRuntime:     LoadPluginSource, GetPluginData, SetPluginData, PickImage, PickFiles, CopyAsset, CopyImage, SaveImageBase64, ReadImageDataUrl
ImageHandler:      ReadImageAsBase64, SaveImageBase64, CopyImageToVolt
LinkPreview:       ResolveLinkPreview
Settings:          GetLocalization, SetLocale
```

### 8.2 After (4 handlers, ~20 methods)

```
FileHandler:       Read, Write, ListTree, CreateFile, CreateDirectory, Delete, Rename
ProcessHandler:    Start, Cancel
DialogHandler:     SelectDirectory, PickFiles, PickImage
StorageHandler:    Get, Set, Delete, List
```

### 8.3 Migration Notes

- **VoltHandler** → Removed. Frontend `plugins/vault-manager/` uses `StorageHandler.Get/Set/List` with namespace `vaults`.
- **NoteHandler** → Removed. Frontend calls `FileHandler.CreateFile` with `.md` extension.
- **SearchHandler** → Removed. Frontend `plugins/search/` uses `FileHandler.ListTree` + client-side content search.
- **PluginCatalog + PluginRuntime** → Removed. Frontend `kernel/plugin-system/` manages plugins via `StorageHandler` for state/data and direct file operations for `main.js`.
- **ImageHandler** → Removed. Frontend `plugins/image-service/` uses `DialogHandler.PickImage` + `FileHandler.Read`/`FileHandler.Write` for base64 conversion.
- **LinkPreview** → Removed. Frontend `plugins/link-preview/` makes HTTP requests directly (or uses a minimal backend primitive if needed).
- **SettingsHandler** → Removed. Frontend `plugins/settings/` uses `StorageHandler.Get/Set` with namespace `settings`.

---

## 9. Migration Strategy — Big Bang

### 9.1 Phase 1: Backend Restructure

1. Create new `backend/` directory structure
2. Move `core/` → `backend/domain/` (selective — delete volt, note, search, plugin)
3. Move `commands/` → `backend/application/` (merge commands into services)
4. Move `infrastructure/` → `backend/infrastructure/` (rename)
5. Move `interfaces/` → `backend/interfaces/` (reduce from 9 to 4 handlers)
6. Update `bootstrap/container.go`
7. Update `main.go`
8. Run `wails dev` — verify backend compiles and Wails bindings generate

### 9.2 Phase 2: Frontend Kernel

1. Create `kernel/` directory structure
2. Move editor → `kernel/editor/` (split by feature)
3. Move plugin system → `kernel/plugin-system/` (upgrade to v5 API)
4. Move workspace manager → `kernel/workspace/`
5. Move navigation → `kernel/navigation/`
6. Create design tokens → `shared/design-tokens/`
7. Redesign all UI components → `shared/ui/`
8. Add lint enforcement (stylelint + ESLint)

### 9.3 Phase 3: Frontend Plugins

1. Create `plugins/` directory structure
2. Move file tree → `plugins/file-tree/`
3. Move search → `plugins/search/`
4. Move image handling → `plugins/image-service/`
5. Move link previews → `plugins/link-preview/`
6. Move vault management → `plugins/vault-manager/`
7. Move settings → `plugins/settings/`
8. Move breadcrumbs → `plugins/breadcrumbs/`
9. Move file viewer → `plugins/file-viewer/`

### 9.4 Phase 4: API Layer

1. Update `shared/api/` for new backend API (4 handlers)
2. Remove old API clients (note, volt, search, image, link-preview, settings, plugin)
3. Add new API clients (process, dialog, storage)
4. Update all plugins to use new API clients

### 9.5 Phase 5: Pages & Routes

1. Update `pages/home/` to use vault-manager plugin
2. Update `pages/workspace/` to use kernel workspace manager
3. Remove `pages/settings/` (moved to plugin)
4. Update routing

### 9.6 Phase 6: Cleanup & Verification

1. Delete all old files
2. Run `wails dev` — full smoke test
3. Run Playwright E2E tests
4. Verify all plugins load correctly
5. Verify editor features work (auto-save, images, find, TOC, slash commands)
6. Verify theme switching works
7. Verify i18n works
8. Verify plugin API v5 lifecycle hooks work
9. Verify inter-plugin communication works
10. Verify design tokens are enforced (no hardcoded colors in components)

---

## 10. Post-Refactor Directory Structure

```
VOLT-core/
├── main.go
├── wails.json
├── go.mod
├── go.sum
├── refactor.md
│
├── backend/
│   ├── domain/
│   │   ├── file/
│   │   ├── process/
│   │   ├── dialog/
│   │   └── storage/
│   ├── application/
│   │   ├── file/
│   │   ├── process/
│   │   ├── dialog/
│   │   ├── storage/
│   │   └── manager.go
│   ├── infrastructure/
│   │   ├── filesystem/
│   │   ├── process/
│   │   ├── dialog/
│   │   ├── storage/
│   │   └── wails/
│   ├── interfaces/
│   │   ├── file_handler.go
│   │   ├── process_handler.go
│   │   ├── dialog_handler.go
│   │   ├── storage_handler.go
│   │   ├── lifecycle.go
│   │   └── vault_asset_server.go
│   └── bootstrap/
│       └── container.go
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── app/
│   │   ├── kernel/
│   │   │   ├── editor/
│   │   │   ├── plugin-system/
│   │   │   ├── workspace/
│   │   │   └── navigation/
│   │   ├── plugins/
│   │   │   ├── file-tree/
│   │   │   ├── search/
│   │   │   ├── image-service/
│   │   │   ├── link-preview/
│   │   │   ├── vault-manager/
│   │   │   ├── settings/
│   │   │   ├── breadcrumbs/
│   │   │   └── file-viewer/
│   │   ├── shared/
│   │   │   ├── api/
│   │   │   ├── ui/
│   │   │   ├── design-tokens/
│   │   │   ├── lib/
│   │   │   ├── config/
│   │   │   └── i18n/
│   │   ├── pages/
│   │   └── types/
│   │
│   ├── tests/
│   └── public/
│
└── docs/
    ├── architecture.md
    ├── backend.md
    ├── frontend.md
    ├── plugins.md
    ├── release.md
    └── refactor.md  (this file)
```

---

## Appendix A: Editor Feature Modules

Each editor feature is a separate module in `kernel/editor/`:

| Module | Responsibility | Files |
|--------|---------------|-------|
| `core/` | Tiptap instance creation, editor config, lifecycle | `EditorEngine.ts`, `EditorInstance.ts`, `EditorConfig.ts` |
| `extensions/` | Tiptap extensions (slash command, code block, table, math, embed, find-in-file) | One subfolder per extension |
| `serialization/` | Markdown ↔ Prosemirror conversion | `MarkdownParser.ts`, `MarkdownSerializer.ts` |
| `auto-save/` | Auto-save timing, dirty tracking, save handler registration | `AutoSaveService.ts`, `DirtyTracker.ts` |
| `image-handling/` | Image drag-drop, paste, resolution, base64 conversion | `ImageDropHandler.ts`, `ImagePasteHandler.ts`, `ImageResolver.ts` |
| `sessions/` | Editor session management, anchors, plugin sessions | `EditorSessionManager.ts`, `EditorSession.ts`, `AnchorManager.ts` |
| `toc/` | Table of contents generation from headings | `TocGenerator.ts` |
| `ui/` | Editor panel UI components | `EditorPanel.tsx`, `MarkdownEditorSurface.tsx` |

---

## Appendix B: Plugin Lifecycle (v5)

```
1. User opens workspace
2. WorkspaceManager emits 'workspace:opened' event
3. PluginLifecycleManager discovers enabled plugins
4. For each plugin:
   a. Load main.js source via StorageHandler
   b. Create sandboxed API context (PluginApiFactory)
   c. Execute onLoad(api) — plugin registers UI, commands, etc.
   d. Emit 'workspace:opened' to plugin via onWorkspaceOpen hook
5. Plugin renders registered UI components (sidebar, toolbar, etc.)
6. User interacts with plugin
7. On settings change → onSettingsChange(event) called
8. User closes workspace:
   a. PluginLifecycleManager calls onUnload(api) for each plugin
   b. Plugin cleanup runs
   c. All registrations removed
   d. Event subscriptions cleaned up
   e. Processes terminated
```

---

## Appendix C: Design Token Usage Rules

| Token Type | Where to Use | Forbidden |
|-----------|-------------|-----------|
| `--color-*` | All color values | Hardcoded hex/rgb |
| `--spacing-*` | All padding, margin, gap | Hardcoded px/rem |
| `--text-*` | All font-size values | Hardcoded px/rem |
| `--radius-*` | All border-radius values | Hardcoded px |
| `--shadow-*` | All box-shadow values | Hardcoded shadow strings |
| `--z-*` | All z-index values | Hardcoded numbers |
| `--leading-*` | All line-height values | Hardcoded numbers |
| `--tracking-*` | All letter-spacing values | Hardcoded em |

---

## Appendix D: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API breakage | High | Generate new Wails bindings, test all 4 handlers before frontend work |
| Plugin API v5 incompatibility | High | Provide migration guide; v4 plugins show deprecation warning |
| Editor feature split bugs | Medium | Test each editor feature independently after migration |
| Design token migration | Medium | Visual regression testing with Playwright screenshots |
| Big bang migration complexity | High | Complete all phases in single branch; don't merge incrementally |
| Lost functionality | High | Create checklist of all current features; verify each post-migration |
