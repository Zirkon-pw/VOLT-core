# Документация Volt

Документация в `docs/` синхронизирована с target-state из `refactor.md` и каталога `refactoring/`.

## С чего начать

1. [`architecture.md`](architecture.md) — общая схема приложения и границы слоёв.
2. [`backend.md`](backend.md) — Go backend, composition root и 4 Wails handler'а.
3. [`frontend.md`](frontend.md) — React/Vite frontend, `kernel/*`, `plugins/*`, страницы и маршруты.
4. [`plugins.md`](plugins.md) — пользовательские плагины, `apiVersion: 5`, lifecycle hooks и host API.
5. [`release.md`](release.md) — сборка и релизный процесс.

## Коротко о target-state

- Backend публикует только `FileHandler`, `ProcessHandler`, `DialogHandler`, `StorageHandler`.
- Frontend использует только алиасы `@app`, `@pages`, `@shared`, `@kernel`, `@plugins`.
- Legacy-слои `kernel/compat`, `@entities`, `@features`, `@widgets`, `shared/lib/plugin-runtime`, `PluginCatalog`, `PluginRuntime` удалены.
- Пользовательские плагины живут в `~/.volt/plugins/<pluginId>/` и читаются через `FileHandler`.
- Состояние и plugin-local данные живут в namespace-файлах `StorageHandler`, а не в `plugin-state.json` или `data.json`.

## Термины

- `volt` — локальное хранилище на диске, которое открывается пользователем.
- `workspace` — активный `volt`, открытый в UI.
- `plugin system` — frontend-ядро загрузки пользовательских и встроенных плагинов.
