# VOLT Refactor Status

Источник истины для target-state:

- `refactor.md`
- `refactoring/`

## Итоговый статус

### Завершено

- backend переведён на `domain/application/infrastructure/interfaces/bootstrap`
- Wails bridge сокращён до `FileHandler`, `ProcessHandler`, `DialogHandler`, `StorageHandler`
- canonical file API использует `Read/Write/ListTree/CreateFile/CreateDirectory/Delete/Rename`
- frontend переведён на слои `@app`, `@pages`, `@shared`, `@kernel`, `@plugins`
- legacy-слои `kernel/compat`, `@entities`, `@features`, `@widgets`, `shared/lib/plugin-runtime` удалены из активной архитектуры
- `PluginCatalog` и `PluginRuntime` удалены как публичные API
- пользовательские плагины читаются из `~/.volt/plugins/<pluginId>/manifest.json` и `main.js`
- plugin state/data переведены на namespace storage:
  - `vaults`
  - `settings`
  - `plugins`
  - `plugin-data:<pluginId>`
- plugin API доведён до рабочего v5 surface:
  - lifecycle hooks
  - `fs.exists/stat/safePath`
  - `search.query`
  - `storage.delete/clear`
  - `plugins.list/isEnabled/send/on/respond`
  - `ui.registerSettingsPage`
- регрессии по GitHub embed и table context menu исправлены

### Проверки

- [x] `go test ./...`
- [x] `npm run build`
- [x] `npm run test:e2e` — `42/42`

### Ручной smoke

- [ ] `wails dev` end-to-end smoke ещё нужно прогнать вручную в desktop runtime:
  - file CRUD
  - rename/delete
  - dialogs
  - process start/cancel
  - workspace open/close
  - plugin load/unload
  - theme/locale switch

## Что считать target-state

- репозиторий не должен возвращаться к legacy alias/compat-слоям
- документация должна оставаться синхронизированной с `refactor.md`
- новые изменения должны идти поверх v5 plugin API и 4-handler bridge
