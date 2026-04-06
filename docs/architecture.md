# Архитектура Volt

## Общая схема

VOLT состоит из двух крупных частей:

- `backend/` — Go backend c локальным файловым и process-слоем.
- `frontend/` — React/Vite desktop UI с редактором, workspace-shell и plugin system.

Связь между частями проходит через Wails bridge. В target-state bridge публикует только 4 handler'а:

- `FileHandler`
- `ProcessHandler`
- `DialogHandler`
- `StorageHandler`

Все старые handler'ы и plugin-specific bridge-методы удалены.

## Frontend слои

Frontend собирается вокруг пяти алиасов:

- `@app` — провайдеры, app-shell, роутер.
- `@pages` — страницы и route-level композиция.
- `@shared` — UI-kit, API-клиенты, lib-хелперы, i18n, конфиг.
- `@kernel` — editor, workspace, navigation, plugin-system.
- `@plugins` — встроенные плагины.

Старые слои `@entities`, `@features`, `@widgets` и `kernel/compat` не используются.

## Ядро frontend

### `kernel/editor`

Отвечает за host editor surfaces, markdown serialization, autosave, image handling, anchor/session management и редакторные extension-модули.

### `kernel/workspace`

Отвечает за:

- lifecycle workspace
- раскладку панелей
- file/plugin tabs
- workspace shell и route sync

### `kernel/navigation`

Держит историю переходов и навигационные store.

### `kernel/plugin-system`

Отвечает за:

- загрузку пользовательских плагинов из `~/.volt/plugins/<pluginId>/main.js`
- выдачу host API v5
- lifecycle hooks `onLoad`, `onUnload`, `onSettingsChange`, `onWorkspaceOpen`
- event bus и inter-plugin messaging
- registry UI-регистраций плагинов
- task-status, prompt и permission UI

## Встроенные плагины

`frontend/src/plugins/` содержит встроенные плагины приложения:

- `vault-manager`
- `settings`
- `file-tree`
- `breadcrumbs`
- `file-viewer`
- `image-service`
- `search`
- `link-preview`

Они используют тот же plugin system, что и внешние плагины, но поставляются вместе с приложением.

## Backend слои

Backend организован по схеме:

- `domain/`
- `application/`
- `infrastructure/`
- `interfaces/`
- `bootstrap/`

`bootstrap/container.go` остаётся единым composition root. Отдельный `manager.go` не обязателен, пока orchestration остаётся там.

## Хранение данных

Канонический домашний каталог приложения: `~/.volt`.

### Файлы

- пользовательские плагины: `~/.volt/plugins/<pluginId>/manifest.json`
- пользовательские плагины: `~/.volt/plugins/<pluginId>/main.js`

### Namespace storage

`StorageHandler` хранит JSON-namespace файлы в `~/.volt/`:

- `vaults`
- `settings`
- `plugins`
- `plugin-data:<pluginId>`

Это заменяет legacy-подход с `plugin-state.json` и `data.json`.

## Публичные инварианты

- пользовательский plugin source-of-truth — файловая система, а не `StorageHandler`
- plugin state/data — только namespace storage
- canonical file bridge — `Read`, `Write`, `ListTree`, `CreateFile`, `CreateDirectory`, `Delete`, `Rename`
- plugin API публикуется только как v5
