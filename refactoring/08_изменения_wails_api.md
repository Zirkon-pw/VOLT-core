# Изменения Wails Bridge API

## 1. До (9 обработчиков, ~40 методов)

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

## 2. После (4 обработчика, ~20 методов)

```
FileHandler:       Read, Write, ListTree, CreateFile, CreateDirectory, Delete, Rename
ProcessHandler:    Start, Cancel
DialogHandler:     SelectDirectory, PickFiles, PickImage
StorageHandler:    Get, Set, Delete, List
```

## 3. Детализация изменений

### 3.1 VoltHandler → УДАЛЁН

| Было | Стало |
|------|-------|
| `ListVolts()` | `StorageHandler.List('vaults')` |
| `CreateVolt(name, path)` | `StorageHandler.Set('vaults', id, {name, path})` |
| `CreateVoltInParent(name, parentPath)` | `StorageHandler.Set('vaults', id, {name, path})` |
| `DeleteVolt(id)` | `StorageHandler.Delete('vaults', id)` |

**Миграция:** Фронтенд `plugins/vault-manager/` использует `StorageHandler.Get/Set/Delete/List` с namespace `vaults`.

### 3.2 NoteHandler → УДАЛЁН

| Было | Стало |
|------|-------|
| `CreateNote(voltId, title, content)` | `FileHandler.CreateFile(path)` с расширением `.md` |

**Миграция:** Фронтенд вызывает `FileHandler.CreateFile` с путём `.md` и содержимым markdown.

### 3.3 SearchHandler → УДАЛЁН

| Было | Стало |
|------|-------|
| `SearchFiles(voltId, query)` | `FileHandler.ListTree(root)` + клиентский поиск по содержимому |

**Миграция:** Фронтенд `plugins/search/` получает дерево файлов через `FileHandler.ListTree`, выполняет полнотекстовый поиск на клиенте.

### 3.4 PluginCatalog + PluginRuntime → УДАЛЕНЫ

| Было | Стало |
|------|-------|
| `ListPlugins()` | Плагин читает `~/.volt/plugins/` через `FileHandler.List` |
| `ImportPlugin(zipPath)` | Плагин распаковывает ZIP через `FileHandler.Write` |
| `LoadPlugin(pluginId)` | Плагин читает `main.js` через `FileHandler.Read` |
| `TogglePlugin(pluginId, enabled)` | Плагин обновляет `plugin-state.json` через `StorageHandler.Set` |
| `DeletePlugin(pluginId)` | Плагин удаляет директорию через `FileHandler.Delete` |
| `GetPluginsDirectory()` | Плагин определяет путь через `StorageHandler.Get` |
| `LoadPluginSource(pluginId)` | Плагин читает `main.js` через `FileHandler.Read` |
| `GetPluginData(pluginId)` | Плагин читает `data.json` через `StorageHandler.Get` |
| `SetPluginData(pluginId, data)` | Плагин записывает `data.json` через `StorageHandler.Set` |
| `PickImage()` | `DialogHandler.PickImage()` |
| `PickFiles(config)` | `DialogHandler.PickFiles(accept, multiple)` |
| `CopyAsset(source, target)` | Фронтенд: `FileHandler.Read(source)` + `FileHandler.Write(target)` |
| `CopyImage(source, target)` | Фронтенд: `FileHandler.Read(source)` + `FileHandler.Write(target)` |
| `SaveImageBase64(name, base64)` | Фронтенд: декодирует base64 + `FileHandler.Write` |
| `ReadImageDataUrl(path)` | Фронтенд: `FileHandler.Read(path)` + конвертация |

**Миграция:** Фронтенд `kernel/plugin-system/` управляет плагинами через `StorageHandler` для состояния/данных и прямые файловые операции для `main.js`.

### 3.5 ImageHandler → УДАЛЁН

| Было | Стало |
|------|-------|
| `ReadImageAsBase64(path)` | Фронтенд: `FileHandler.Read(path)` + конвертация |
| `SaveImageBase64(name, base64)` | Фронтенд: декодирует base64 + `FileHandler.Write` |
| `CopyImageToVolt(source, target)` | Фронтенд: `FileHandler.Read(source)` + `FileHandler.Write(target)` |

**Миграция:** Фронтенд `plugins/image-service/` использует `DialogHandler.PickImage` + `FileHandler.Read`/`FileHandler.Write` для конвертации base64.

### 3.6 LinkPreview → УДАЛЁН

| Было | Стало |
|------|-------|
| `ResolveLinkPreview(url)` | Фронтенд делает HTTP-запросы напрямую |

**Миграция:** Фронтенд `plugins/link-preview/` делает HTTP-запросы напрямую (или использует минимальный примитив бэкенда, если нужен CORS).

### 3.7 SettingsHandler → УДАЛЁН

| Было | Стало |
|------|-------|
| `GetLocalization()` | Фронтенд загружает локали из `shared/i18n/locales/` |
| `SetLocale(locale)` | `StorageHandler.Set('settings', 'locale', locale)` |

**Миграция:** Фронтенд `plugins/settings/` использует `StorageHandler.Get/Set` с namespace `settings`.

## 4. Новые обработчики

### 4.1 ProcessHandler

| Метод | Описание |
|-------|----------|
| `Start(config)` | Запуск ОС-процесса. Config: `{command, args, stdin, cwd, stdoutMode, stderrMode}` |
| `Cancel(id)` | Отмена процесса по ID |

### 4.2 DialogHandler

| Метод | Описание |
|-------|----------|
| `SelectDirectory()` | Открыть диалог выбора директории |
| `PickFiles(accept, multiple)` | Открыть диалог выбора файлов |
| `PickImage()` | Открыть диалог выбора изображения |

### 4.3 StorageHandler

| Метод | Описание |
|-------|----------|
| `Get(namespace, key)` | Получить значение из KV-хранилища |
| `Set(namespace, key, value)` | Сохранить значение в KV-хранилище |
| `Delete(namespace, key)` | Удалить значение из KV-хранилища |
| `List(namespace)` | Получить все ключи в namespace |

**Namespaces:**
- `vaults` — список vault'ов
- `settings` — настройки приложения
- `plugins` — состояние и данные плагинов
- `plugin-data:<pluginId>` — данные конкретного плагина

## 5. Сводная таблица

| Обработчик (до) | Обработчик (после) | Методы |
|----------------|-------------------|--------|
| VoltHandler | **Удалён** | → `StorageHandler` |
| FileHandler | FileHandler | `Read`, `Write`, `ListTree`, `CreateFile`, `CreateDirectory`, `Delete`, `Rename` |
| NoteHandler | **Удалён** | → `FileHandler.CreateFile` |
| SearchHandler | **Удалён** | → `FileHandler.ListTree` + клиентский поиск |
| PluginCatalog | **Удалён** | → `kernel/plugin-system/` |
| PluginRuntime | **Удалён** | → `kernel/plugin-system/` + `DialogHandler` + `StorageHandler` |
| ImageHandler | **Удалён** | → `DialogHandler` + `FileHandler` |
| LinkPreview | **Удалён** | → `plugins/link-preview/` |
| SettingsHandler | **Удалён** | → `StorageHandler` |
| — | ProcessHandler | `Start`, `Cancel` |
| — | DialogHandler | `SelectDirectory`, `PickFiles`, `PickImage` |
| — | StorageHandler | `Get`, `Set`, `Delete`, `List` |

**Итого:** 9 обработчиков → 4 обработчика, ~40 методов → ~20 методов.
