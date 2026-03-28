import type { VoltPluginAPI } from './pluginApi';
import {
  registerCommand,
  registerContextMenuItem,
  registerPluginPage,
  registerSidebarButton,
  registerSidebarPanel,
  registerSlashCommand,
  registerToolbarButton,
  usePluginRegistryStore,
} from './pluginRegistry';
import { getEditor } from './editorBridge';
import { onTracked } from './pluginEventBus';
import { readNote, saveNote, listTree } from '@api/note';
import { getPluginData, setPluginData } from '@api/plugin';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { useTabStore } from '@app/stores/tabStore';
import { useToastStore } from '@app/stores/toastStore';
import { icons } from '@uikit/icon/icons';
import type { IconName } from '@uikit/icon';
import { reportPluginError, safeExecuteMaybeAsync } from './safeExecute';

function normalizePluginIcon(icon?: string): IconName {
  if (icon && icon in icons) {
    return icon as IconName;
  }
  return 'file';
}

export function createPluginAPI(
  pluginId: string,
  voltPath: string,
  permissions: string[],
): VoltPluginAPI {
  const declaredPermissions = new Set(permissions);

  const namespaceId = (configId: string) => `${pluginId}:${configId}`;

  const requirePermission = (permission: 'read' | 'write' | 'editor', action: string) => {
    if (declaredPermissions.has(permission)) {
      return;
    }

    throw reportPluginError(
      pluginId,
      action,
      new Error(`Permission "${permission}" is required for ${action}`),
    );
  };

  const wrapCallback = <TArgs extends unknown[]>(
    label: string,
    callback: (...args: TArgs) => void | Promise<void>,
  ) => (...args: TArgs): void => {
    safeExecuteMaybeAsync(pluginId, label, () => callback(...args));
  };

  const wrapFilter = <TArg,>(
    label: string,
    filter?: (arg: TArg) => boolean,
  ) => {
    if (!filter) {
      return undefined;
    }

    return (arg: TArg): boolean => {
      try {
        return filter(arg);
      } catch (err) {
        reportPluginError(pluginId, label, err);
        return false;
      }
    };
  };

  return {
    volt: {
      async read(path: string): Promise<string> {
        requirePermission('read', 'volt.read');
        return readNote(voltPath, path);
      },
      async write(path: string, content: string): Promise<void> {
        requirePermission('write', 'volt.write');
        return saveNote(voltPath, path, content);
      },
      async list(dirPath?: string): Promise<unknown[]> {
        requirePermission('read', 'volt.list');
        return listTree(voltPath, dirPath ?? '');
      },
      getActivePath(): string | null {
        requirePermission('read', 'volt.getActivePath');
        const voltId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!voltId) return null;
        const tabState = useTabStore.getState();
        const activeTabId = tabState.activeTabs[voltId] ?? null;
        if (!activeTabId) return null;
        const tabs = tabState.tabs[voltId] ?? [];
        const tab = tabs.find((t) => t.id === activeTabId);
        return tab && tab.type === 'file' ? tab.filePath : null;
      },
    },
    ui: {
      registerSidebarPanel(config) {
        registerSidebarPanel({
          id: namespaceId(config.id),
          pluginId,
          title: config.title,
          render: config.render,
        });
      },
      registerCommand(config) {
        registerCommand({
          id: namespaceId(config.id),
          pluginId,
          name: config.name,
          hotkey: config.hotkey,
          callback: wrapCallback(`command:${config.id}`, config.callback),
        });
      },
      registerPluginPage(config) {
        registerPluginPage({
          id: namespaceId(config.id),
          pluginId,
          title: config.title,
          mode: config.mode,
          render: config.render,
          cleanup: config.cleanup,
        });
      },
      registerSlashCommand(config) {
        registerSlashCommand({
          id: namespaceId(config.id),
          pluginId,
          title: config.title,
          description: config.description,
          icon: normalizePluginIcon(config.icon),
          callback: wrapCallback(`slash:${config.id}`, config.callback),
        });
      },
      registerContextMenuItem(config) {
        registerContextMenuItem({
          id: namespaceId(config.id),
          pluginId,
          label: config.label,
          icon: config.icon ? normalizePluginIcon(config.icon) : undefined,
          filter: wrapFilter(`contextMenuFilter:${config.id}`, config.filter),
          callback: wrapCallback(`contextMenu:${config.id}`, config.callback),
        });
      },
      registerToolbarButton(config) {
        registerToolbarButton({
          id: namespaceId(config.id),
          pluginId,
          label: config.label,
          icon: normalizePluginIcon(config.icon),
          callback: wrapCallback(`toolbar:${config.id}`, config.callback),
        });
      },
      registerSidebarButton(config) {
        registerSidebarButton({
          id: namespaceId(config.id),
          pluginId,
          label: config.label,
          icon: normalizePluginIcon(config.icon),
          callback: wrapCallback(`sidebarButton:${config.id}`, config.callback),
        });
      },
      openPluginPage(pageId: string) {
        const voltId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!voltId) {
          throw reportPluginError(pluginId, `openPluginPage:${pageId}`, new Error('No active workspace'));
        }

        const fullPageId = namespaceId(pageId);
        const page = usePluginRegistryStore.getState().pluginPages.find((entry) => entry.id === fullPageId);
        if (!page) {
          throw reportPluginError(
            pluginId,
            `openPluginPage:${pageId}`,
            new Error(`Plugin page "${fullPageId}" is not registered`),
          );
        }

        if (page.mode === 'tab') {
          useTabStore.getState().openPluginTab(voltId, page.id, page.title);
          return;
        }

        window.dispatchEvent(new CustomEvent('volt:navigate-plugin-page', {
          detail: { voltId, pageId: page.id },
        }));
      },
      openFile(path: string) {
        const voltId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!voltId) {
          throw reportPluginError(pluginId, `openFile:${path}`, new Error('No active workspace'));
        }

        const normalizedPath = path.trim();
        if (!normalizedPath) {
          throw reportPluginError(pluginId, 'openFile', new Error('File path is required'));
        }

        useTabStore.getState().openTab(voltId, normalizedPath, normalizedPath);
      },
      showNotice(message: string, durationMs?: number) {
        useToastStore.getState().addToast(message, 'info', durationMs ?? 4000);
      },
    },
    editor: {
      getContent(): string | null {
        requirePermission('editor', 'editor.getContent');
        const editor = getEditor();
        if (!editor) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (editor.storage as any).markdown?.getMarkdown() ?? null;
      },
      insertAtCursor(text: string): void {
        requirePermission('editor', 'editor.insertAtCursor');
        getEditor()?.chain().focus().insertContent(text).run();
      },
    },
    events: {
      on(event: string, callback: (...args: unknown[]) => void | Promise<void>): () => void {
        return onTracked(pluginId, event, wrapCallback(`event:${event}`, callback));
      },
    },
    storage: {
      async get(key: string): Promise<unknown> {
        const raw = await getPluginData(pluginId, key);
        if (!raw) return undefined;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      },
      async set(key: string, value: unknown): Promise<void> {
        await setPluginData(pluginId, key, JSON.stringify(value));
      },
    },
  };
}
