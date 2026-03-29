import { useEffect } from 'react';
import { useFileTreeStore } from '@app/stores/fileTreeStore';
import { useActiveFileStore } from '@app/stores/activeFileStore';
import { useTabStore } from '@app/stores/tabStore';
import { usePluginRegistryStore } from '@app/plugins/pluginRegistry';

interface UseKeyboardShortcutsOptions {
  voltId: string;
  voltPath: string;
}

function matchesHotkey(hotkey: string, e: KeyboardEvent): boolean {
  const parts = hotkey.toLowerCase().split('+').map((p) => p.trim());
  const needMod = parts.includes('mod');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');
  const key = parts.find((p) => p !== 'mod' && p !== 'shift' && p !== 'alt');

  if (!key) return false;
  if (needMod && !(e.metaKey || e.ctrlKey)) return false;
  if (!needMod && (e.metaKey || e.ctrlKey)) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key;
}

export function useKeyboardShortcuts({ voltId, voltPath }: UseKeyboardShortcutsOptions) {
  const getActiveTab = () => {
    const state = useTabStore.getState();
    const activeTabId = state.activeTabs[voltId] ?? null;
    if (!activeTabId) return null;
    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((t) => t.id === activeTabId) ?? null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Built-in shortcuts (take priority)
      if (mod) {
        switch (e.key) {
          case 's': {
            e.preventDefault();
            void useActiveFileStore.getState().saveActiveFile(voltId);
            return;
          }
          case 'w': {
            e.preventDefault();
            const tab = getActiveTab();
            if (tab) {
              useTabStore.getState().closeTab(voltId, tab.id);
            }
            return;
          }
          case 'n': {
            e.preventDefault();
            useFileTreeStore.getState().startCreate(voltId, '', false);
            return;
          }
        }
      }

      // Plugin commands
      const commands = usePluginRegistryStore.getState().commands;
      for (const cmd of commands) {
        if (cmd.hotkey && matchesHotkey(cmd.hotkey, e)) {
          e.preventDefault();
          cmd.callback();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voltId, voltPath]);
}
