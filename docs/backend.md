# Backend

## Слои

Backend расположен в `backend/` и разделён на слои:

- `domain/` — сущности, repository contracts, domain errors.
- `application/` — сервисы use-case уровня.
- `infrastructure/` — файловая система, KV storage, dialog/runtime adapters.
- `interfaces/` — Wails handlers и lifecycle glue.
- `bootstrap/` — composition root.

## Wails bridge

В bridge опубликованы только 4 handler'а:

### `FileHandler`

Канонические методы:

- `Read(rootPath, path)`
- `Write(rootPath, path, content)`
- `ListTree(rootPath, path)`
- `CreateFile(rootPath, path, content)`
- `CreateDirectory(rootPath, path)`
- `Delete(rootPath, path)`
- `Rename(rootPath, oldPath, newPath)`

Старые сигнатуры `ReadFile`, `WriteFile`, `DeletePath`, `RenamePath` удалены.

### `ProcessHandler`

- `Start(req)`
- `Cancel(runId)`

Используется для локальных OS-process внутри заданного рабочего каталога.

### `DialogHandler`

Используется для выбора директорий, файлов и изображений.

### `StorageHandler`

- `ConfigDir()`
- `Get(namespace, key)`
- `Set(namespace, key, value)`
- `Delete(namespace, key)`
- `List(namespace)`

`StorageHandler` хранит JSON namespace-файлы в `~/.volt/`.

## Хранилище

### Config dir

Канонический config dir: `~/.volt`.

### Namespace-файлы

Каждый namespace хранится отдельно:

- `~/.volt/vaults.json`
- `~/.volt/settings.json`
- `~/.volt/plugins.json`
- `~/.volt/plugin-data:<pluginId>.json`

### Пользовательские плагины

Исходники плагинов backend не хранит в storage. Source-of-truth:

- `~/.volt/plugins/<pluginId>/manifest.json`
- `~/.volt/plugins/<pluginId>/main.js`

## Файловая безопасность

`backend/infrastructure/filesystem/file_repository.go` делает path traversal protection через canonical safe path resolution внутри `rootPath`.

## Asset server

`backend/interfaces/vault_asset_server.go` отдаёт workspace assets для frontend preview/render сценариев.

## Удалённые legacy-компоненты

Из backend удалены:

- `VoltHandler`
- `NoteHandler`
- `SearchHandler`
- `PluginCatalogHandler`
- `PluginRuntimeHandler`
- `ImageHandler`
- `LinkPreviewHandler`
- `SettingsHandler`

Также удалена plugin-specific backend логика хранения `plugin-state.json`, `data.json` и legacy plugin store.

## Проверка

Основная базовая проверка backend:

```bash
go test ./...
```
