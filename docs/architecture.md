# Архитектура Volt

## Общая схема

VOLT состоит из двух крупных частей:

- `backend/` — Go backend c локальным файловым и process-слоем.
- `frontend/` — React/Vite desktop UI с редактором, workspace-shell и plugin system.

Связь между частями проходит через Wails bridge. Bridge публикует только 4 handler'а:

- `FileHandler`
- `ProcessHandler`
- `DialogHandler`
- `StorageHandler`

## Поток зависимостей

Строгий однонаправленный поток:

```
plugins → kernel → shared
```

- `@plugins/` **может** импортировать из `@kernel/` и `@shared/`
- `@kernel/` **может** импортировать из `@shared/` и `@kernel/`
- `@kernel/` **НЕ может** импортировать из `@plugins/`
- Единственное исключение: `kernel/plugin-system/builtin/registry.ts` — bootstrapping файл, регистрирующий builtin-плагины

### Service Interfaces

Kernel предоставляет сервис-интерфейсы в `kernel/services/`:

- **fileTreeService** — доступ к файловому дереву (stores)
- **appSettingsService** — настройки приложения
- **imageService** — операции с изображениями
- **linkPreviewService** — превью ссылок
- **searchService** — поиск по файлам
- **shortcutService** — разрешение горячих клавиш
- **workspaceSlotRegistry** — регистрация UI-компонентов для слотов workspace

Плагины регистрируют свои реализации при загрузке модуля. Kernel вызывает функции через сервис, не зная конкретного плагина.

### Workspace Slot Registry

WorkspaceShell рендерит UI-компоненты плагинов (sidebar, breadcrumbs, search, file-view-host) через именованные слоты. Плагины регистрируют свои компоненты:

```typescript
useWorkspaceSlotRegistry.getState().registerSlot('sidebar', Sidebar);
```

WorkspaceShell получает компонент из реестра:

```typescript
const slots = useWorkspaceSlotRegistry((state) => state.slots);
const SidebarSlot = slots['sidebar'];
```

## Frontend слои

Frontend собирается вокруг пяти алиасов:

- `@app` — провайдеры, app-shell, роутер.
- `@pages` — страницы и route-level композиция.
- `@shared` — UI-kit, API-клиенты, lib-хелперы, i18n, конфиг.
- `@kernel` — editor, workspace, navigation, plugin-system, services.
- `@plugins` — встроенные плагины.

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
- `builtin/` — bootstrapping реестр встроенных плагинов

### `kernel/services`

Сервис-интерфейсы для связи kernel с plugins без прямых импортов. Каждый сервис — Zustand store с nullable реализацией, которую плагин регистрирует при загрузке.

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

Они используют тот же plugin system, что и внешние плагины, но поставляются вместе с приложением. Каждый плагин регистрирует свои сервисы и слоты в `*Plugin.ts`.

## Backend слои

Backend организован по схеме:

- `domain/`
- `application/`
- `infrastructure/`
- `interfaces/`
- `bootstrap/`

`bootstrap/container.go` остаётся единым composition root.

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

## Публичные инварианты

- пользовательский plugin source-of-truth — файловая система, а не `StorageHandler`
- plugin state/data — только namespace storage
- canonical file bridge — `Read`, `Write`, `ListTree`, `CreateFile`, `CreateDirectory`, `Delete`, `Rename`
- plugin API публикуется только как v5
- kernel НЕ импортирует из plugins (кроме builtin registry)
