export interface VoltPluginAPI {
  volt: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    list(dirPath?: string): Promise<unknown[]>;
    getActivePath(): string | null;
  };
  ui: {
    registerSidebarPanel(config: {
      id: string;
      title: string;
      render: (container: HTMLElement) => void;
    }): void;
    registerCommand(config: {
      id: string;
      name: string;
      hotkey?: string;
      callback: () => void | Promise<void>;
    }): void;
    registerPluginPage(config: {
      id: string;
      title: string;
      mode: 'tab' | 'route';
      render: (container: HTMLElement) => void;
      cleanup?: () => void;
    }): void;
    registerSlashCommand(config: {
      id: string;
      title: string;
      description: string;
      icon: string;
      callback: () => void | Promise<void>;
    }): void;
    registerContextMenuItem(config: {
      id: string;
      label: string;
      icon?: string;
      filter?: (entry: { path: string; isDir: boolean }) => boolean;
      callback: (entry: { path: string; isDir: boolean }) => void | Promise<void>;
    }): void;
    registerToolbarButton(config: {
      id: string;
      label: string;
      icon: string;
      callback: () => void | Promise<void>;
    }): void;
    registerSidebarButton(config: {
      id: string;
      label: string;
      icon: string;
      callback: () => void | Promise<void>;
    }): void;
    openPluginPage(pageId: string): void;
    openFile(path: string): void;
    showNotice(message: string, durationMs?: number): void;
  };
  editor: {
    getContent(): string | null;
    insertAtCursor(text: string): void;
  };
  events: {
    on(event: string, callback: (...args: unknown[]) => void | Promise<void>): () => void;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
}
