# Фронтенд

## Стек

- React `18`
- TypeScript
- Vite
- Sass Modules
- Zustand
- Tiptap

## Ключевая идея

Frontend не только рендерит core UI, но и выступает runtime-слоем для плагинов. Именно здесь:

- загружаются `main.js` плагинов
- создаётся ограниченный `api` для каждого plugin instance
- хранится registry всех UI extensions
- выполняется safe logging, permission guard и cleanup lifecycle

## Основные страницы

- [`frontend/src/pages/home/HomePage.tsx`](../frontend/src/pages/home/HomePage.tsx) - домашняя страница со списком volt и модальным окном создания
- [`frontend/src/pages/workspace/WorkspacePage.tsx`](../frontend/src/pages/workspace/WorkspacePage.tsx) - рабочее пространство выбранного volt

## Состояние приложения

Состояние хранится в `Zustand` store:

- `voltStore` - список volt и операции загрузки, создания, удаления
- `workspaceStore` - открытые рабочие пространства
- `tabStore` - вкладки файлов и plugin pages, активные элементы и dirty-флаги
- `pluginRegistry` - команды, pages, slash-команды, toolbar/sidebar/context menu registrations
- `pluginLogStore` - лог ошибок plugin runtime
- `pluginPromptStore` - host-side prompt modal для плагинов
- `pluginSettingsStore` - cached plugin settings values и live change dispatch для `api.settings`
- `pluginTaskStatusStore` - persistent task statuses для long-running plugin tasks, включая floating cards и editor banners

## Виджеты рабочего пространства

Рабочая область собирается из нескольких независимых блоков:

- `Sidebar` - левый activity rail + collapsible sidebar pane
- `FileTree` - дерево файлов и каталогов
- `FileTabs` - вкладки открытых файлов
- `EditorPanel` - редактор заметки
- `PluginPageHost` - контейнер для полноценных страниц плагинов
- `WorkspaceToolbar` - зона plugin toolbar buttons
- `SearchPopup` - всплывающий поиск и command palette (`>`)

## Редактор и поиск

- редактор построен на `Tiptap`
- автосохранение вызывается из `useAutoSave`
- editor runtime испускает plugin events `file-open`, `file-save` и `editor-change`
- slash-меню поддерживает как built-in actions, так и plugin slash commands
- поиск можно открыть по `Double Shift`
- также поддерживается `Cmd+K` или `Ctrl+K`
- если строка поиска начинается с `>`, `SearchPopup` переходит в режим command palette

## Маршрутизация

Маршруты описаны в [`frontend/src/app/routes/AppRouter.tsx`](../frontend/src/app/routes/AppRouter.tsx):

- `/` - домашняя страница
- `/workspace/:voltId` - рабочее пространство volt
- `/workspace/:voltId/plugin/:pageId` - full-screen route page плагина
- `/settings` - general settings
- `/settings/plugins` - список плагинов и enable/disable toggle
- `/settings/plugin/:pluginId` - отдельная host-rendered settings page конкретного плагина
- `/settings/about` - about page

## Plugin runtime

Основные runtime-узлы:

- [`frontend/src/shared/lib/plugin-runtime/pluginLoader.ts`](../frontend/src/shared/lib/plugin-runtime/pluginLoader.ts) - загрузка/выгрузка плагинов
- [`frontend/src/shared/lib/plugin-runtime/pluginApiFactory.ts`](../frontend/src/shared/lib/plugin-runtime/pluginApiFactory.ts) - создание ограниченного API с permission guards
- [`frontend/src/entities/plugin/model/pluginRegistry.ts`](../frontend/src/entities/plugin/model/pluginRegistry.ts) - реестр UI registration-ов
- [`frontend/src/entities/plugin/model/pluginSettingsStore.ts`](../frontend/src/entities/plugin/model/pluginSettingsStore.ts) - reserved settings storage, merge с default values и `settings.onChange`
- [`frontend/src/shared/lib/plugin-runtime/pluginEventBus.ts`](../frontend/src/shared/lib/plugin-runtime/pluginEventBus.ts) - plugin-local события и tracked unsubscribe
- [`frontend/src/shared/lib/plugin-runtime/editorSessionManager.ts`](../frontend/src/shared/lib/plugin-runtime/editorSessionManager.ts) - note sessions, detached buffers и anchor mapping
- [`frontend/src/shared/lib/plugin-runtime/pluginProcessManager.ts`](../frontend/src/shared/lib/plugin-runtime/pluginProcessManager.ts) - frontend bridge для desktop process runs
- [`frontend/src/features/plugin-task-status/model/pluginTaskStatusStore.ts`](../frontend/src/features/plugin-task-status/model/pluginTaskStatusStore.ts) - host-managed task statuses, surface routing и cleanup lifecycle

Plugin settings UI теперь не зависит от plugin runtime:

- schema settings объявляется declarative в `manifest.json -> settings.sections`
- `SettingsPage` получает список плагинов через `listPlugins()` и строит отдельные top-level пункты меню для плагинов с settings
- `Plugins` page остаётся toggle-only и не рендерит settings inline
- host-rendered settings page доступна даже без активного workspace и даже если plugin disabled
- live apply идёт через reserved storage key `__volt_plugin_settings__` и `settings.onChange(...)`

Подробное описание plugin API и формата плагинов вынесено в [docs/plugins.md](plugins.md).
