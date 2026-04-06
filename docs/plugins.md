# Плагины

## Source of Truth

Пользовательские плагины в Volt живут на файловой системе:

```text
~/.volt/plugins/<pluginId>/
  manifest.json
  main.js
```

`StorageHandler` не хранит исходник плагина. Он хранит только state/data в namespace storage.

## Manifest

Минимальный `manifest.json`:

```json
{
  "apiVersion": 5,
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Example plugin",
  "main": "main.js",
  "permissions": ["read"],
  "settings": {
    "customUI": false,
    "sections": []
  }
}
```

### Важные поля

- `apiVersion` — текущая каноническая версия API: `5`
- `id` — стабильный уникальный идентификатор плагина
- `main` — entry file, обычно `main.js`
- `permissions` — список разрешений
- `settings.customUI` — если `true`, плагин может отрисовать свою settings page

## Lifecycle hooks

Плагин v5 экспортирует lifecycle hooks из `main.js`:

```javascript
export function onLoad(api) {
  api.ui.registerCommand({
    id: 'hello',
    name: 'Hello',
    callback: () => api.ui.notify('Hello from plugin'),
  });
}

export function onWorkspaceOpen(api, workspace) {
  console.log(workspace.rootPath);
}

export function onSettingsChange(api, event) {
  console.log(event.key, event.value);
}

export function onUnload(api) {
  console.log('plugin unloaded');
}
```

Порядок вызова:

1. `onLoad(api)`
2. `onWorkspaceOpen(api, workspace)`
3. `onSettingsChange(api, event)` — при изменении настроек
4. `onUnload(api)`

Для legacy v4-плагинов сохранён fallback-режим загрузки, но он считается временным shim и логируется как deprecated.

## Host API v5

Основные разделы `VoltPluginAPI`:

- `fs.read/write/create/list/exists/stat/safePath`
- `workspace.getActivePath/getRootPath`
- `search.registerTextProvider/query`
- `assets.pickFile/pickImage/copyImage/saveImageBase64/readImageDataUrl`
- `process.start`
- `plugins.send/on/respond/list/isEnabled`
- `ui.registerCommand/registerPage/registerFileViewer/registerSettingsPage/openFile/openPluginPage/notify`
- `editor.captureActiveSession/openSession/listKinds/getCapabilities/mount`
- `events.on(...)`
- `storage.get/set/delete/clear`
- `settings.get/getAll/set/onChange`

## Permissions

Поддерживаемые runtime permissions:

- `read`
- `write`
- `editor`
- `process`
- `external`
- `inter-plugin`

## Хранение данных

Плагинские данные хранятся в namespace:

- `plugin-data:<pluginId>`

Состояние включения плагинов хранится отдельно:

- `plugins`

Общие namespace приложения:

- `vaults`
- `settings`

## Discovery и enable/disable

Frontend plugin system:

1. получает config dir через `StorageHandler.ConfigDir()`
2. читает каталог `~/.volt/plugins`
3. читает `manifest.json` и `main.js` через `FileHandler`
4. хранит enabled-state в namespace `plugins`
5. хранит plugin-local data в namespace `plugin-data:<pluginId>`

## Custom settings UI

Если в manifest указано:

```json
{
  "settings": {
    "customUI": true
  }
}
```

плагин может зарегистрировать собственную страницу настроек:

```javascript
export function onLoad(api) {
  api.ui.registerSettingsPage({
    id: 'settings',
    title: 'My Plugin',
    render(container) {
      container.textContent = 'Custom settings UI';
    },
  });
}
```
