import { useEffect } from 'react';
import {
  BUILTIN_SHORTCUT_ACTIONS,
  getPluginCommandShortcutActionId,
  useResolvedShortcuts,
  useShortcutAction,
} from '@entities/app-settings';
import { useActiveFileStore } from '@entities/editor-session';
import { useFileTreeStore } from '@entities/file-tree';
import { usePluginRegistryStore } from '@entities/plugin';
import { useTabStore } from '@entities/tab';
import { matchesShortcutBinding } from '@shared/lib/hotkeys';

interface UseWorkspaceHotkeysOptions {
  voltId: string;
  onToggleSearch: () => void;
  onToggleSidebar: () => void;
}

export function useWorkspaceHotkeys({
  voltId,
  onToggleSearch,
  onToggleSidebar,
}: UseWorkspaceHotkeysOptions) {
  const commands = usePluginRegistryStore((state) => state.commands);
  const { byActionId } = useResolvedShortcuts();

  const getActiveTab = () => {
    const state = useTabStore.getState();
    const activeTabId = state.activeTabs[voltId] ?? null;
    if (!activeTabId) return null;

    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((tab) => tab.id === activeTabId) ?? null;
  };

  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.workspaceSearchToggle, onToggleSearch, {
    allowInEditable: true,
  });
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.workspaceSearchDoubleShift, onToggleSearch);
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.workspaceSidebarToggle, onToggleSidebar, {
    allowInEditable: true,
  });
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.editorSave, () => {
    void useActiveFileStore.getState().saveActiveFile(voltId);
  }, {
    allowInEditable: true,
  });
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.tabsCloseActive, () => {
    const activeTab = getActiveTab();
    if (activeTab) {
      useTabStore.getState().closeTab(voltId, activeTab.id);
    }
  }, {
    allowInEditable: true,
  });
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.fileCreate, () => {
    useFileTreeStore.getState().startCreate(voltId, '', false);
  }, {
    allowInEditable: true,
  });

  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const command of commands) {
        const resolvedShortcut = byActionId[getPluginCommandShortcutActionId(command.id)];
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
  }, [byActionId, commands]);
}
