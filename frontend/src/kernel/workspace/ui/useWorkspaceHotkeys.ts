import { useEffect } from 'react';
import { useActiveFileStore } from '@kernel/editor/sessions/model';
import { getFileTreeServiceStore } from '@kernel/services/fileTreeService';
import { useShortcutService } from '@kernel/services/shortcutService';
import { usePluginRegistryStore } from '@kernel/plugin-system/model/pluginRegistry';
import { useTabStore } from '@kernel/workspace/tabs/model';
import { matchesShortcutBinding } from '@shared/lib/hotkeys';

interface UseWorkspaceHotkeysOptions {
  voltId: string;
  onOpenSearch: (initialQuery?: string) => void;
  onToggleSidebar: () => void;
  onOpenFindInFile: () => void;
}

export function useWorkspaceHotkeys({
  voltId,
  onOpenSearch,
  onToggleSidebar,
  onOpenFindInFile,
}: UseWorkspaceHotkeysOptions) {
  const commands = usePluginRegistryStore((state) => state.commands);
  const shortcutMethods = useShortcutService((state) => state.methods);

  const useResolvedShortcuts = shortcutMethods?.useResolvedShortcuts;
  const useShortcutAction = shortcutMethods?.useShortcutAction;
  const BUILTIN_SHORTCUT_ACTIONS = shortcutMethods?.BUILTIN_SHORTCUT_ACTIONS;
  const getPluginCommandShortcutActionId = shortcutMethods?.getPluginCommandShortcutActionId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolved = useResolvedShortcuts?.() as any;
  const byActionId: Record<string, { status: string; binding: string | null }> = resolved?.byActionId ?? {};

  const getActiveTab = () => {
    const state = useTabStore.getState();
    const activeTabId = state.activeTabs[voltId] ?? null;
    if (!activeTabId) return null;

    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((tab) => tab.id === activeTabId) ?? null;
  };

  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.workspaceSearchToggle ?? '', () => onOpenSearch('>'), {
    allowInEditable: true,
  });
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.workspaceSearchDoubleShift ?? '', () => onOpenSearch(''));
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.workspaceSidebarToggle ?? '', onToggleSidebar, {
    allowInEditable: true,
  });
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.editorSave ?? '', () => {
    void useActiveFileStore.getState().saveActiveFile(voltId);
  }, {
    allowInEditable: true,
  });
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.tabsCloseActive ?? '', () => {
    const activeTab = getActiveTab();
    if (activeTab) {
      useTabStore.getState().closeTab(voltId, activeTab.id);
    }
  }, {
    allowInEditable: true,
  });
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.fileCreate ?? '', () => {
    getFileTreeServiceStore().startCreate(voltId, '', false);
  }, {
    allowInEditable: true,
  });
  useShortcutAction?.(BUILTIN_SHORTCUT_ACTIONS?.fileFind ?? '', onOpenFindInFile, {
    allowInEditable: true,
  });

  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const command of commands) {
        const actionId = getPluginCommandShortcutActionId?.(command.id);
        if (!actionId) continue;

        const resolvedShortcut = byActionId[actionId];
        if (resolvedShortcut?.status !== 'active' || !resolvedShortcut.binding) {
          continue;
        }

        if (resolvedShortcut.binding === 'DoubleShift') {
          if (event.key !== 'Shift') {
            continue;
          }

          const now = Date.now();
          if (now - lastShiftTime < 300) {
            lastShiftTime = 0;
            event.preventDefault();
            command.callback();
            return;
          }

          lastShiftTime = now;
          continue;
        }

        if (matchesShortcutBinding(resolvedShortcut.binding, event)) {
          event.preventDefault();
          command.callback();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [byActionId, commands, getPluginCommandShortcutActionId]);
}
