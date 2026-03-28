# Бэкенд

## Основные модули

- `core/volt` - сущность volt и контракт хранилища volt
- `core/note` - сущности и ошибки для работы с файлами заметок
- `core/search` - структура результатов поиска

## Use case-слой

В `internal/application/` лежат отдельные операции:

- `volt/` - создание, удаление и получение списка volt
- `note/` - чтение, сохранение, создание файлов и каталогов, удаление и переименование
- `search/` - полнотекстовый поиск по markdown-файлам

Такой формат упрощает развитие логики без сильной связности между слоями.

## Wails handlers

Каталог `internal/interfaces/wailshandler/` это внешний API backend для frontend.

Handlers группируются по зонам ответственности:

- `VoltHandler`
- `NoteHandler`
- `SearchHandler`
- `PluginHandler`
- `AppHandler`

`AppHandler` на старте передает `context.Context` во вложенные handlers.

## Работа с заметками

Реализация [`internal/infrastructure/filesystem/note_repository.go`](../internal/infrastructure/filesystem/note_repository.go) выполняет всю файловую работу.

Особенности:

- каждый путь проходит через `safePath`, чтобы не выйти за пределы выбранного volt
- скрытые файлы и каталоги игнорируются при построении дерева
- директории сортируются раньше файлов
- операции чтения и записи возвращают доменные ошибки вроде `ErrFileNotFound` и `ErrPermissionDenied`

## Хранение списка volt

Реализация [`internal/infrastructure/persistence/local/volt_store.go`](../internal/infrastructure/persistence/local/volt_store.go) хранит список подключенных volt в JSON-файле в домашнем каталоге пользователя.

Особенности:

- путь к файлу: `~/.volt/volts.json`
- доступ синхронизирован через `sync.RWMutex`
- повторное добавление того же пути блокируется

## Поиск

Поиск реализован в [`internal/application/search/search_files.go`](../internal/application/search/search_files.go).

Правила:

- поиск выполняется только по файлам `.md`
- сначала возвращаются совпадения по имени файла
- затем совпадения по содержимому
- максимум `50` результатов на запрос
- максимум `5` совпадений по содержимому на один файл

## Плагины

Плагины хранятся в `~/.volt/plugins` и подгружаются отдельно от core-сервисов.

Host-side backend оставляет для них только инфраструктурные операции:

- список установленных плагинов
- загрузка исходника `main.js`
- включение и выключение
- key/value storage для plugin data
