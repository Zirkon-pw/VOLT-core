import { useMemo } from 'react';
import { usePluginRegistryStore } from '@kernel/plugin-system/model';
import { resolveShortcutDescriptors, type ResolvedShortcut, type ShortcutDescriptor } from '@shared/lib/hotkeys';
import { useAppSettingsStore } from './appSettingsStore';
import { getShortcutDescriptors } from './shortcutCatalog';

interface ResolvedShortcutsResult {
  descriptors: ShortcutDescriptor[];
  items: ResolvedShortcut[];
  byActionId: Record<string, ResolvedShortcut>;
}

export function useResolvedShortcuts(): ResolvedShortcutsResult {
  const commands = usePluginRegistryStore((state) => state.commands);
  const overrides = useAppSettingsStore((state) => state.settings.shortcutOverrides);

  return useMemo(() => {
    const descriptors = getShortcutDescriptors(commands);
    const items = resolveShortcutDescriptors(descriptors, overrides);
    const byActionId = items.reduce<Record<string, ResolvedShortcut>>((acc, item) => {
      acc[item.actionId] = item;
      return acc;
    }, {});

    return {
      descriptors,
      items,
      byActionId,
    };
  }, [commands, overrides]);
}

export function useResolvedShortcut(actionId: string): ResolvedShortcut | null {
  const shortcuts = useResolvedShortcuts();
  return shortcuts.byActionId[actionId] ?? null;
}
