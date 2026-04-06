import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { PluginSettingChangeEvent, PluginWorkspaceInfo, VoltPluginAPI } from '@kernel/plugin-system/api/PluginApiV5';

export interface BuiltinPluginModule {
  manifest: PluginManifest;
  onLoad?: (api: VoltPluginAPI) => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;
  onUnload?: (api: VoltPluginAPI) => void | Promise<void>;
  onSettingsChange?: (api: VoltPluginAPI, event: PluginSettingChangeEvent) => void | Promise<void>;
  onWorkspaceOpen?: (api: VoltPluginAPI, workspace: PluginWorkspaceInfo) => void | Promise<void>;
}
