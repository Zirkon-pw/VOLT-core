# VOLT

Volt -- это десктопное приложение для работы с локальными markdown-хранилищами. Проект собран на `Wails`, `Go`, `React` и `TypeScript`.

## Возможности

- управление локальными volt-хранилищами
- редактирование markdown-заметок
- поиск по именам файлов и содержимому
- расширяемая система плагинов: команды, slash-меню, plugin pages, toolbar, sidebar, context menu
- граф заметок и другие дополнительные возможности через внешние плагины

## Быстрый старт

Требования:

- Go `1.26+`
- Node.js `20+`
- Wails CLI `v2`

Установка Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0
```

Запуск в режиме разработки:

```bash
wails dev
```

Сборка:

```bash
wails build
```

## Документация

- [Обзор документации](docs/README.md)
- [Архитектура](docs/architecture.md)
- [Бэкенд](docs/backend.md)
- [Фронтенд](docs/frontend.md)
- [Плагинная система](docs/plugins.md)
- [Релизы и GitHub Actions](docs/release.md)
