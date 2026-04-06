# Frontend

## Стек

- React 18
- Vite
- TypeScript
- Zustand
- Tiptap

## Алиасы

В проекте используются только:

- `@app`
- `@pages`
- `@shared`
- `@kernel`
- `@plugins`

## Правило зависимостей

Строгий однонаправленный поток: `plugins → kernel → shared`.

`@kernel/` никогда не импортирует из `@plugins/` напрямую. Единственное исключение — `kernel/plugin-system/builtin/registry.ts`.

Kernel получает функциональность плагинов через сервис-интерфейсы в `kernel/services/`.

## Структура

### `src/app`

App-shell, провайдеры темы и локализации, router, route composition.

### `src/pages`

Страницы верхнего уровня:

- home
- workspace
- settings routes
- playwright harness

### `src/shared`

Общие API-клиенты, UI-kit, i18n, utility-хелперы, дизайн-токены и runtime helpers.

- `shared/lib/image/` — общие React-хуки для изображений (useImageDrag, useImageZoom)

### `src/kernel`

#### `kernel/editor`

Host editor logic:

- editor panel
- markdown serialization
- autosave
- image drag/drop
- extension modules (в `ui/extensions/`)
- detached editor sessions

#### `kernel/workspace`

Workspace shell, pane layout, tabs, file/plugin route coordination.

Структура плоская — без `internal/` вложенностей:

```
workspace/
  core/           — WorkspaceStore, WorkspaceManager
  panes/          — PaneSplitter, WorkspaceViewStore
  tabs/
    file-tabs/    — FileTabs (UI)
    model/        — TabStore, selectors
  ui/
    workspace-tabs/     — WorkspaceTabs (UI)
    workspace-toolbar/  — WorkspaceToolbar (UI)
    useWorkspaceHotkeys.ts
    WorkspaceShell.tsx
```

#### `kernel/navigation`

Navigation history и state management.

#### `kernel/plugin-system`

Frontend kernel для плагинов:

- `api/` — типы и runtime API
- `builtin/` — bootstrapping реестр встроенных плагинов (registry.ts, types.ts)
- `events/` — inter-plugin messaging
- `lifecycle/` — PluginLifecycleManager
- `loader/` — загрузка плагинов
- `model/` — pluginRegistry, pluginLogStore, pluginSettingsStore (прямые импорты, без barrel)
- `runtime/` — pluginLoader, pluginApiFactory, hostEditorService, etc.
- `ui/` — permission, plugin-page, prompt, task-status

#### `kernel/services`

Сервис-интерфейсы для доступа kernel к функциональности плагинов:

- `fileTreeService.ts` — файловое дерево (reactive store proxy)
- `appSettingsService.ts` — настройки приложения (reactive store proxy)
- `imageService.ts` — операции с изображениями
- `linkPreviewService.ts` — превью ссылок
- `searchService.ts` — поиск по файлам
- `shortcutService.ts` — горячие клавиши
- `workspaceSlotRegistry.ts` — UI-слоты для workspace

### `src/plugins`

Встроенные плагины приложения:

- `vault-manager`
- `settings`
- `file-tree`
- `breadcrumbs`
- `file-viewer`
- `image-service`
- `search`
- `link-preview`

Каждый плагин в `*Plugin.ts` регистрирует свои сервисы и слоты через `@kernel/services/`.

## Shared API

Frontend вызывает backend только через `shared/api/*`:

- `file`
- `process`
- `dialog`
- `storage`
- runtime/browser helpers

## Plugin system в UI

Plugin registry (`pluginRegistry.ts`) держит:

- commands
- sidebar panels
- plugin pages
- settings pages
- file viewers
- search providers
- slash/context/toolbar/sidebar actions

Импорт из registry — напрямую из `@kernel/plugin-system/model/pluginRegistry`, без barrel-файла.

## Проверка

Основные frontend-команды:

```bash
npm run build
npm run test:e2e
```
