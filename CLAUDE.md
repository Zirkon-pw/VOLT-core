# CLAUDE.md

## Project

Volt — десктопное приложение для работы с локальными markdown knowledge stores. Wails (Go backend) + React/TypeScript frontend.

## Build & Run

```bash
# Frontend
cd frontend && npm install && npm run build

# Full app (Wails)
wails dev        # development
wails build      # production

# Type check
cd frontend && npx tsc --noEmit

# E2E tests
cd frontend && npm run test:e2e
```

## Architecture Rules

### Dependency flow (strict)

```
plugins → kernel → shared
```

- `@kernel/` NEVER imports from `@plugins/` (except `kernel/plugin-system/builtin/registry.ts`)
- Kernel accesses plugin functionality through service interfaces in `kernel/services/`
- Plugins register their implementations at module load time

### Path aliases

- `@app` — `src/app/`
- `@pages` — `src/pages/`
- `@shared` — `src/shared/`
- `@kernel` — `src/kernel/`
- `@plugins` — `src/plugins/`

### Import conventions

- Import from `@kernel/plugin-system/model/pluginRegistry` directly, NOT from barrel `model/index.ts`
- Import from specific store files, not barrel re-exports
- No `internal/` directory nesting — keep structure flat

### Service interfaces (`kernel/services/`)

Zustand stores with nullable implementations. Plugins register via `.getState().register(...)`.

- `fileTreeService` — reactive store proxy for file tree
- `appSettingsService` — reactive store proxy for settings
- `imageService` — image operations (pick, save, read, convert)
- `linkPreviewService` — link preview resolution
- `searchService` — file search
- `shortcutService` — keyboard shortcuts
- `workspaceSlotRegistry` — UI component slots for WorkspaceShell

### Workspace slots

WorkspaceShell renders plugin UI via named slots:
- `sidebar`, `breadcrumbs`, `search-popup`, `file-view-host`

### UI components

`shared/ui/` uses controller/view/model pattern consistently (do not remove it).

### Backend

Go DDD: `domain/ → application/ → infrastructure/ → interfaces/`. Composition root: `bootstrap/container.go`.

4 Wails handlers: FileHandler, ProcessHandler, DialogHandler, StorageHandler.
