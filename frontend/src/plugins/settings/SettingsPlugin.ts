import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';
import { registerAppSettingsStore } from '@kernel/services/appSettingsService';
import { useShortcutService } from '@kernel/services/shortcutService';
import { useAppSettingsStore } from './model/appSettingsStore';
import {
  BUILTIN_SHORTCUT_ACTIONS,
  getPluginCommandShortcutActionId,
} from './model/shortcutCatalog';
import { useResolvedShortcuts } from './model/useResolvedShortcuts';
import { useShortcutAction } from './model/useShortcutAction';

export const settingsManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-settings',
  name: 'Settings',
  version: '1.0.0',
  description: 'Built-in application settings and plugin configuration pages.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

registerAppSettingsStore(useAppSettingsStore);
useShortcutService.getState().register({
  useResolvedShortcuts,
  useShortcutAction,
  BUILTIN_SHORTCUT_ACTIONS,
  getPluginCommandShortcutActionId,
});

export const settingsPlugin: BuiltinPluginModule = {
  manifest: settingsManifest,
};
