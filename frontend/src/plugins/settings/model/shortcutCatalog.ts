import type { RegisteredCommand } from '@kernel/plugin-system/model/pluginRegistry';
import type { ShortcutDescriptor } from '@shared/lib/hotkeys';
import type { ShortcutActionId } from './types';

export const BUILTIN_SHORTCUT_ACTIONS = {
  workspaceSearchToggle: 'workspace.search.toggle',
  workspaceSearchDoubleShift: 'workspace.search.doubleShift',
  workspaceSidebarToggle: 'workspace.sidebar.toggle',
  editorSave: 'editor.save',
  fileFind: 'file.find',
  tabsCloseActive: 'tabs.closeActive',
  fileCreate: 'file.create',
  fileRename: 'file.rename',
  modalClose: 'modal.close',
} as const satisfies Record<string, ShortcutActionId>;

export function getPluginCommandShortcutActionId(commandId: string): ShortcutActionId {
  return `plugin.command:${commandId}`;
}

export function getPluginCommandShortcutActionPrefix(pluginId: string): string {
  return `plugin.command:${pluginId}:`;
}

const BUILTIN_SHORTCUT_DESCRIPTORS: ShortcutDescriptor[] = [
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.workspaceSearchToggle,
    group: 'app',
    source: 'built-in',
    label: 'Invoke Command',
    labelKey: 'settings.shortcuts.actions.workspaceSearchToggle',
    defaultBinding: 'Mod+K',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.workspaceSearchDoubleShift,
    group: 'app',
    source: 'built-in',
    label: 'Open Search',
    labelKey: 'settings.shortcuts.actions.workspaceSearchDoubleShift',
    defaultBinding: 'DoubleShift',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.workspaceSidebarToggle,
    group: 'app',
    source: 'built-in',
    label: 'Toggle Sidebar',
    labelKey: 'settings.shortcuts.actions.workspaceSidebarToggle',
    defaultBinding: 'Mod+B',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.tabsCloseActive,
    group: 'app',
    source: 'built-in',
    label: 'Close Active Tab',
    labelKey: 'settings.shortcuts.actions.tabsCloseActive',
    defaultBinding: 'Mod+W',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.modalClose,
    group: 'app',
    source: 'built-in',
    label: 'Close Dialog',
    labelKey: 'settings.shortcuts.actions.modalClose',
    defaultBinding: 'Escape',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.editorSave,
    group: 'editor',
    source: 'built-in',
    label: 'Save Active File',
    labelKey: 'settings.shortcuts.actions.editorSave',
    defaultBinding: 'Mod+S',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.fileFind,
    group: 'editor',
    source: 'built-in',
    label: 'Find in Current File',
    labelKey: 'settings.shortcuts.actions.fileFind',
    defaultBinding: 'Mod+F',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.fileCreate,
    group: 'file-tree',
    source: 'built-in',
    label: 'Create File',
    labelKey: 'settings.shortcuts.actions.fileCreate',
    defaultBinding: 'Mod+N',
  },
  {
    actionId: BUILTIN_SHORTCUT_ACTIONS.fileRename,
    group: 'file-tree',
    source: 'built-in',
    label: 'Rename Selected File',
    labelKey: 'settings.shortcuts.actions.fileRename',
    defaultBinding: 'F2',
  },
];

export function getShortcutDescriptors(commands: RegisteredCommand[]): ShortcutDescriptor[] {
  const pluginDescriptors = [...commands]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map<ShortcutDescriptor>((command) => ({
      actionId: getPluginCommandShortcutActionId(command.id),
      group: 'plugins',
      source: 'plugin',
      label: command.name,
      subtitle: command.pluginId,
      defaultBinding: command.hotkey ?? null,
      pluginId: command.pluginId,
    }));

  return [...BUILTIN_SHORTCUT_DESCRIPTORS, ...pluginDescriptors];
}
