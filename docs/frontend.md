# Фронтенд

## Стек

- React `18`
- TypeScript
- Vite
- Sass Modules
- Zustand
- Tiptap

## Основные страницы

- [`frontend/src/pages/home/HomePage.tsx`](../frontend/src/pages/home/HomePage.tsx) - домашняя страница со списком volt и модальным окном создания
- [`frontend/src/pages/workspace/WorkspacePage.tsx`](../frontend/src/pages/workspace/WorkspacePage.tsx) - рабочее пространство выбранного volt

## Состояние приложения

Состояние хранится в `Zustand` store:

- `voltStore` - список volt и операции загрузки, создания, удаления
- `workspaceStore` - открытые рабочие пространства
- `tabStore` - вкладки файлов и plugin pages, активные элементы и dirty-флаги

## Виджеты рабочего пространства

Рабочая область собирается из нескольких независимых блоков:

- `Sidebar` - левая панель
- `FileTree` - дерево файлов и каталогов
- `FileTabs` - вкладки открытых файлов
- `EditorPanel` - редактор заметки
- `PluginPageHost` - контейнер для полноценных страниц плагинов
- `SearchPopup` - всплывающий поиск

## Редактор и поиск

- редактор построен на `Tiptap`
- автосохранение вызывается из `useAutoSave`
- поиск можно открыть по `Double Shift`
- также поддерживается `Cmd+K` или `Ctrl+K`

## Маршрутизация

Маршруты описаны в [`frontend/src/app/routes/AppRouter.tsx`](../frontend/src/app/routes/AppRouter.tsx):

- `/` - домашняя страница
- `/workspace/:voltId` - рабочее пространство volt
