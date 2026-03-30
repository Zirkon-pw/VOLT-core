export type ShortcutBinding = string;
export type ShortcutSource = 'built-in' | 'plugin' | 'override';
export type ShortcutStatus = 'active' | 'conflicted' | 'unbound';
export type ShortcutGroup = 'app' | 'editor' | 'file-tree' | 'plugins';

export interface ShortcutDescriptor {
  actionId: string;
  group: ShortcutGroup;
  source: 'built-in' | 'plugin';
  label: string;
  labelKey?: string;
  subtitle?: string;
  defaultBinding: ShortcutBinding | null;
  pluginId?: string;
}

export interface ResolvedShortcut {
  actionId: string;
  descriptor: ShortcutDescriptor;
  binding: ShortcutBinding | null;
  source: ShortcutSource;
  status: ShortcutStatus;
  conflictWith: string | null;
}
