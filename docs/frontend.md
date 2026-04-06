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

Legacy-алиасы `@entities`, `@features`, `@widgets` удалены.

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

### `src/kernel`

#### `kernel/editor`

Host editor logic:

- editor panel
- markdown serialization
- autosave
- image drag/drop
- extension modules
- detached editor sessions

#### `kernel/workspace`

Workspace shell, pane layout, tabs, file/plugin route coordination.

#### `kernel/navigation`

Navigation history и state management.

#### `kernel/plugin-system`

Frontend kernel для плагинов:

- loader
- API factory
- lifecycle
- event bus
- registry
- permission/prompt/task-status UI

User plugin lifecycle работает по v5 схеме:

- `onLoad(api)`
- `onWorkspaceOpen(api, workspace)`
- `onSettingsChange(api, event)`
- `onUnload(api)`

Для старых внешних плагинов сохранён legacy fallback-режим загрузки.

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

## Shared API

Frontend вызывает backend только через `shared/api/*`:

- `file`
- `process`
- `dialog`
- `storage`
- runtime/browser helpers

Legacy API-каталоги `note`, `volt`, `search`, `image`, `link-preview`, `settings`, `plugin` удалены.

## Plugin system в UI

Plugin registry держит:

- commands
- sidebar panels
- plugin pages
- settings pages
- file viewers
- search providers
- slash/context/toolbar/sidebar actions

Плагины могут регистрировать custom settings UI через `api.ui.registerSettingsPage(...)`.

## Проверка

Основные frontend-команды:

```bash
npm run build
npm run test:e2e
```
