import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useI18n } from '@app/providers/I18nProvider';
import { useAppSettingsStore } from '@entities/app-settings';
import { useActiveFileStore } from '@entities/editor-session';
import type { RegisteredHostEditorFileViewer } from '@entities/plugin';
import { useFileTreeStore } from '@entities/file-tree';
import { useTabStore } from '@entities/tab';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import { readFile, writeFile } from '@shared/api/file';
import { dataUrlToBlobUrl, readImageBase64 } from '@shared/api/image/imageApi';
import { isMarkdownPath } from '@shared/lib/fileTypes';
import { MarkdownEditorSurface } from '@widgets/workspace-shell/editor-panel/MarkdownEditorSurface';
import { useAutoSave } from '@widgets/workspace-shell/editor-panel/hooks/useAutoSave';
import { useEditorSetup } from '@widgets/workspace-shell/editor-panel/hooks/useEditorSetup';
import { useImageHandlers } from '@widgets/workspace-shell/editor-panel/hooks/useImageHandlers';
import { useImageResolver } from '@widgets/workspace-shell/editor-panel/hooks/useImageResolver';
import { useImageDrag } from '@widgets/workspace-shell/image-viewer/useImageDrag';
import { useImageZoom } from '@widgets/workspace-shell/image-viewer/useImageZoom';
import { emit } from './pluginEventBus';
import {
  getHostEditorCapabilities,
  listHostEditorKinds,
  validateHostEditorConfig,
} from './hostEditorCatalog';
import type {
  EditorEventName,
  EditorHandle,
  EditorKindCapabilities,
  EditorKindInfo,
  EditorMountConfig,
  PluginEditorCommand,
  PluginEditorOverlay,
  PluginEditorPanel,
  PluginEditorToolbarAction,
} from './pluginApi';
import { reportPluginError, safeExecuteMaybeAsync } from './safeExecute';
import { setEditor } from './editorBridge';

interface HostEditorSurfaceProps {
  pluginId?: string;
  mode: 'file-tab' | 'embedded';
  voltId?: string;
  voltPath: string;
  filePath: string;
  config: EditorMountConfig;
  controller?: HostEditorController;
}

interface MountTracker {
  root: Root;
  controller: HostEditorController;
}

type CommandHandler = (payload?: unknown) => Promise<unknown>;

const pluginMountedEditors = new Map<string, Set<MountTracker>>();

class HostEditorController {
  readonly id = globalThis.crypto?.randomUUID?.() ?? `host-editor-${Date.now()}-${Math.random()}`;
  readonly handle: EditorHandle;
  private listeners = new Map<EditorEventName, Set<(payload: unknown) => void | Promise<void>>>();
  private dirty = false;
  private disposed = false;
  private focusHandler: (() => void) | null = null;
  private saveHandler: (() => Promise<void>) | null = null;
  private builtinCommands = new Map<string, CommandHandler>();
  private pluginCommands = new Map<string, CommandHandler>();
  private disposeCallback: (() => void) | null = null;

  constructor(
    readonly pluginId: string | undefined,
    readonly kind: string,
    readonly filePath: string,
  ) {
    this.handle = {
      id: this.id,
      kind: this.kind,
      filePath: this.filePath,
      focus: () => {
        this.focusHandler?.();
      },
      save: async () => {
        if (this.saveHandler) {
          await this.saveHandler();
        }
      },
      dispose: () => {
        this.dispose();
      },
      isDirty: () => this.dirty,
      execute: async (commandId, payload) => this.execute(commandId, payload),
      on: (eventName, callback) => this.on(eventName, callback),
    };
  }

  setDisposeCallback(callback: (() => void) | null): void {
    this.disposeCallback = callback;
  }

  setFocusHandler(handler: (() => void) | null): void {
    this.focusHandler = handler;
  }

  setSaveHandler(handler: (() => Promise<void>) | null): void {
    this.saveHandler = handler;
  }

  setBuiltinCommands(commands: Map<string, CommandHandler>): void {
    this.builtinCommands = commands;
  }

  setPluginCommands(commands: PluginEditorCommand[]): void {
    const next = new Map<string, CommandHandler>();
    commands.forEach((command) => {
      next.set(command.id, async (payload?: unknown) => command.execute(payload));
    });
    this.pluginCommands = next;
  }

  setDirty(dirty: boolean): void {
    if (this.dirty === dirty) {
      return;
    }
    this.dirty = dirty;
    this.emit('dirty-change', dirty);
  }

  emit(eventName: EditorEventName, payload: unknown): void {
    const callbacks = this.listeners.get(eventName);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    callbacks.forEach((callback) => {
      if (this.pluginId) {
        safeExecuteMaybeAsync(this.pluginId, `hostEditor:${this.kind}:${eventName}`, () => Promise.resolve(callback(payload)).then(() => undefined));
        return;
      }

      void Promise.resolve(callback(payload));
    });
  }

  on(eventName: EditorEventName, callback: (payload: unknown) => void | Promise<void>): () => void {
    const callbacks = this.listeners.get(eventName) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(eventName, callbacks);
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  async execute(commandId: string, payload?: unknown): Promise<unknown> {
    const handler = this.pluginCommands.get(commandId) ?? this.builtinCommands.get(commandId);
    if (!handler) {
      throw new Error(`Editor command "${commandId}" is not registered`);
    }

    return handler(payload);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.disposeCallback?.();
    this.disposeCallback = null;
    this.emit('dispose', undefined);
    this.listeners.clear();
    this.builtinCommands.clear();
    this.pluginCommands.clear();
    this.focusHandler = null;
    this.saveHandler = null;
  }
}

function trackMountedEditor(pluginId: string, tracker: MountTracker): void {
  const trackers = pluginMountedEditors.get(pluginId) ?? new Set<MountTracker>();
  trackers.add(tracker);
  pluginMountedEditors.set(pluginId, trackers);
}

function untrackMountedEditor(pluginId: string, tracker: MountTracker): void {
  const trackers = pluginMountedEditors.get(pluginId);
  if (!trackers) {
    return;
  }

  trackers.delete(tracker);
  if (trackers.size === 0) {
    pluginMountedEditors.delete(pluginId);
  }
}

function createCommandMap(
  controller: HostEditorController,
  commands: PluginEditorCommand[],
  extraCommands: Map<string, CommandHandler>,
): Map<string, CommandHandler> {
  controller.setPluginCommands(commands);
  return extraCommands;
}

function useBuiltInEditorLifecycle(
  controller: HostEditorController,
  commands: PluginEditorCommand[],
  extraCommands: Map<string, CommandHandler>,
): void {
  useEffect(() => {
    controller.setBuiltinCommands(createCommandMap(controller, commands, extraCommands));
    return () => {
      controller.setBuiltinCommands(new Map());
      controller.setPluginCommands([]);
    };
  }, [commands, controller, extraCommands]);
}

function HostSlotMount({
  render,
  cleanup,
}: {
  render: (container: HTMLElement) => void;
  cleanup?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }

    container.innerHTML = '';
    render(container);
    return () => {
      cleanup?.();
      container.innerHTML = '';
    };
  }, [cleanup, render]);

  return <div ref={ref} style={{ minHeight: 0, minWidth: 0 }} />;
}

function ToolbarActions({
  actions,
  controller,
}: {
  actions: PluginEditorToolbarAction[];
  controller: HostEditorController;
}) {
  const primary = actions.filter((action) => (action.slot ?? 'primary') === 'primary');
  const secondary = actions.filter((action) => (action.slot ?? 'primary') === 'secondary');

  if (actions.length === 0) {
    return null;
  }

  const renderAction = (action: PluginEditorToolbarAction) => (
    <button
      key={action.id}
      type="button"
      onClick={() => {
        if (action.commandId) {
          void controller.execute(action.commandId);
          return;
        }
        void action.callback?.();
      }}
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        color: 'inherit',
        borderRadius: 8,
        padding: '6px 10px',
        cursor: 'pointer',
      }}
    >
      {action.label}
    </button>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{primary.map(renderAction)}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{secondary.map(renderAction)}</div>
    </div>
  );
}

function HostEditorShell({
  controller,
  toolbarActions,
  panels,
  overlays,
  children,
}: {
  controller: HostEditorController;
  toolbarActions: PluginEditorToolbarAction[];
  panels: PluginEditorPanel[];
  overlays: PluginEditorOverlay[];
  children: ReactNode;
}) {
  const rightPanels = panels.filter((panel) => (panel.slot ?? 'right') === 'right');
  const bottomPanels = panels.filter((panel) => panel.slot === 'bottom');

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'column' }}>
      <ToolbarActions actions={toolbarActions} controller={controller} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
        <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
          {children}
          {overlays.length > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 8,
              }}
            >
              {overlays.map((overlay) => (
                <HostSlotMount key={overlay.id} render={overlay.render} cleanup={overlay.cleanup} />
              ))}
            </div>
          )}
        </div>
        {rightPanels.length > 0 && (
          <div
            style={{
              width: 280,
              minWidth: 280,
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 12,
              overflow: 'auto',
            }}
          >
            {rightPanels.map((panel) => (
              <HostSlotMount key={panel.id} render={panel.render} cleanup={panel.cleanup} />
            ))}
          </div>
        )}
      </div>
      {bottomPanels.length > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 12,
          }}
        >
          {bottomPanels.map((panel) => (
            <HostSlotMount key={panel.id} render={panel.render} cleanup={panel.cleanup} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarkdownEditorDriver({
  controller,
  commands,
  mode,
  voltId,
  voltPath,
  filePath,
  readOnly,
  autofocus,
}: {
  controller: HostEditorController;
  commands: PluginEditorCommand[];
  mode: 'file-tab' | 'embedded';
  voltId?: string;
  voltPath: string;
  filePath: string;
  readOnly: boolean;
  autofocus: boolean;
}) {
  const { t } = useI18n();
  const imageDir = useAppSettingsStore((state) => state.settings.imageDir);
  const editor = useEditorSetup({ placeholder: t('editor.placeholder'), editable: !readOnly });
  const loadedPathRef = useRef<string | null>(null);
  const { resolve, register, unresolveAll, resolveAll, clear } = useImageResolver(voltPath);
  const notifyFsMutation = useFileTreeStore((state) => state.notifyFsMutation);
  const registerSaveHandler = useActiveFileStore((state) => state.registerSaveHandler);
  const pendingRename = useTabStore((state) => (voltId ? state.pendingRenames[voltId] ?? null : null));
  const consumePendingRename = useTabStore((state) => state.consumePendingRename);
  const activeFileTab = useTabStore((state) => {
    if (!voltId) return null;
    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((tab) => tab.id === filePath) ?? null;
  });
  const setDirty = useTabStore((state) => state.setDirty);
  const [embeddedDirty, setEmbeddedDirty] = useState(false);

  const { save: saveFileTab } = useAutoSave({
    editor,
    voltId: voltId ?? '',
    voltPath,
    filePath,
    transformMarkdown: unresolveAll,
  });
  const { handleDrop, handleDragOver, handlePaste } = useImageHandlers({
    editor,
    voltId: voltId ?? '',
    voltPath,
    filePath,
    imageDir,
    resolve,
    register,
    notifyFsMutation,
  });

  const saveEmbedded = useCallback(async () => {
    if (!editor) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let markdown = ((editor.storage as any).markdown?.getMarkdown?.() ?? '') as string;
    markdown = unresolveAll(markdown);
    await writeFile(voltPath, filePath, markdown);
    setEmbeddedDirty(false);
    controller.setDirty(false);
    controller.emit('save', undefined);
  }, [controller, editor, filePath, unresolveAll, voltPath]);

  const save = mode === 'file-tab' ? saveFileTab : saveEmbedded;

  useBuiltInEditorLifecycle(controller, commands, useMemo(() => new Map<string, CommandHandler>([
    ['focus', async () => {
      editor?.chain().focus().run();
      return undefined;
    }],
    ['save', async () => {
      await save();
      return undefined;
    }],
  ]), [editor, save]));

  useEffect(() => {
    controller.setFocusHandler(() => {
      editor?.chain().focus().run();
    });
    controller.setSaveHandler(async () => {
      await save();
    });
    return () => {
      controller.setFocusHandler(null);
      controller.setSaveHandler(null);
    };
  }, [controller, editor, save]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleFocus = () => controller.emit('focus', undefined);
    const handleBlur = () => controller.emit('blur', undefined);
    const handleSelection = () => controller.emit('selection-change', editor.state.selection);
    const handleUpdate = () => {
      controller.emit('change', undefined);
      if (mode === 'embedded' && !readOnly) {
        setEmbeddedDirty(true);
        controller.setDirty(true);
      }
    };

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);
    editor.on('selectionUpdate', handleSelection);
    editor.on('update', handleUpdate);
    controller.emit('ready', undefined);
    if (autofocus) {
      editor.chain().focus().run();
    }

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
      editor.off('selectionUpdate', handleSelection);
      editor.off('update', handleUpdate);
    };
  }, [autofocus, controller, editor, mode, readOnly]);

  useEffect(() => {
    if (mode !== 'file-tab' || !editor || !voltId) {
      return;
    }
    if (filePath && !readOnly) {
      return registerSaveHandler(voltId, filePath, saveFileTab);
    }
    return undefined;
  }, [editor, filePath, mode, readOnly, registerSaveHandler, saveFileTab, voltId]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (mode !== 'file-tab' || !isMarkdownPath(filePath)) {
      return;
    }
    if (filePath) {
      setEditor(editor, { voltId: voltId ?? '', voltPath, filePath });
      return () => {
        setEditor(null);
      };
    }
    return undefined;
  }, [editor, filePath, mode, voltId, voltPath]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        if (mode === 'file-tab' && voltId) {
          const isRenameTransition = pendingRename?.newPath === filePath && loadedPathRef.current === pendingRename.oldPath;
          if (isRenameTransition) {
            if (activeFileTab?.isDirty) {
              await saveFileTab();
            }
            loadedPathRef.current = filePath;
            consumePendingRename(voltId, filePath);
            controller.setDirty(false);
            return;
          }
        }

        clear();
        const raw = await readFile(voltPath, filePath);
        if (cancelled) {
          return;
        }
        const content = await resolveAll(raw);
        if (cancelled) {
          return;
        }
        editor.commands.setContent(content);
        loadedPathRef.current = filePath;
        if (mode === 'file-tab' && voltId) {
          setDirty(voltId, filePath, false);
          emit('file-open', filePath);
        } else {
          setEmbeddedDirty(false);
          controller.setDirty(false);
        }
      } catch (error) {
        console.error('Failed to load markdown editor file:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFileTab?.isDirty, clear, consumePendingRename, controller, editor, filePath, mode, pendingRename, resolveAll, saveFileTab, setDirty, voltId, voltPath]);

  useEffect(() => {
    if (mode === 'file-tab') {
      controller.setDirty(activeFileTab?.isDirty ?? false);
      return;
    }
    controller.setDirty(embeddedDirty);
  }, [activeFileTab?.isDirty, controller, embeddedDirty, mode]);

  return (
    <MarkdownEditorSurface
      editor={editor}
      voltPath={voltPath}
      filePath={filePath}
      readOnly={readOnly}
      showTaskStatusBanner={mode === 'file-tab'}
      onDrop={readOnly ? undefined : handleDrop}
      onDragOver={readOnly ? undefined : handleDragOver}
      onPaste={readOnly ? undefined : handlePaste}
    />
  );
}

function RawTextEditorDriver({
  controller,
  commands,
  mode,
  voltId,
  voltPath,
  filePath,
  readOnly,
  autofocus,
}: {
  controller: HostEditorController;
  commands: PluginEditorCommand[];
  mode: 'file-tab' | 'embedded';
  voltId?: string;
  voltPath: string;
  filePath: string;
  readOnly: boolean;
  autofocus: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const setDirty = useTabStore((state) => state.setDirty);
  const registerSaveHandler = useActiveFileStore((state) => state.registerSaveHandler);
  const [embeddedDirty, setEmbeddedDirty] = useState(false);

  const saveFileTab = useCallback(async () => {
    if (!voltId) {
      return;
    }
    await writeFile(voltPath, filePath, valueRef.current);
    setDirty(voltId, filePath, false);
    controller.setDirty(false);
    controller.emit('save', undefined);
    emit('file-save', filePath);
  }, [controller, filePath, setDirty, voltId, voltPath]);

  const saveEmbedded = useCallback(async () => {
    await writeFile(voltPath, filePath, valueRef.current);
    setEmbeddedDirty(false);
    controller.setDirty(false);
    controller.emit('save', undefined);
  }, [controller, filePath, voltPath]);

  const save = mode === 'file-tab' ? saveFileTab : saveEmbedded;

  useBuiltInEditorLifecycle(controller, commands, useMemo(() => new Map<string, CommandHandler>([
    ['focus', async () => {
      textareaRef.current?.focus();
      return undefined;
    }],
    ['save', async () => {
      await save();
      return undefined;
    }],
  ]), [save]));

  useEffect(() => {
    controller.setFocusHandler(() => {
      textareaRef.current?.focus();
    });
    controller.setSaveHandler(async () => {
      await save();
    });
    controller.emit('ready', undefined);
    if (autofocus) {
      textareaRef.current?.focus();
    }
    return () => {
      controller.setFocusHandler(null);
      controller.setSaveHandler(null);
    };
  }, [autofocus, controller, save]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await readFile(voltPath, filePath);
        if (!cancelled) {
          setValue(raw);
          if (mode === 'file-tab' && voltId) {
            setDirty(voltId, filePath, false);
          } else {
            setEmbeddedDirty(false);
            controller.setDirty(false);
          }
          emit('file-open', filePath);
        }
      } catch (error) {
        console.error('Failed to load raw-text file:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [controller, filePath, mode, setDirty, voltId, voltPath]);

  useEffect(() => {
    if (mode !== 'file-tab' || !voltId || readOnly) {
      return;
    }
    return registerSaveHandler(voltId, filePath, saveFileTab);
  }, [filePath, mode, readOnly, registerSaveHandler, saveFileTab, voltId]);

  const handleChange = useCallback((nextValue: string) => {
    setValue(nextValue);
    controller.emit('change', undefined);
    if (mode === 'file-tab' && voltId) {
      setDirty(voltId, filePath, true);
      controller.setDirty(true);
      emit('editor-change', undefined);
      return;
    }
    setEmbeddedDirty(true);
    controller.setDirty(true);
  }, [controller, filePath, mode, setDirty, voltId]);

  useEffect(() => {
    if (mode === 'embedded') {
      controller.setDirty(embeddedDirty);
    }
  }, [controller, embeddedDirty, mode]);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'column' }}>
      {mode === 'file-tab' && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <textarea
        ref={textareaRef}
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          resize: 'none',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          padding: 16,
          outline: 'none',
          font: 'inherit',
        }}
        value={value}
        onFocus={() => controller.emit('focus', undefined)}
        onBlur={() => controller.emit('blur', undefined)}
        onSelect={() => controller.emit('selection-change', {
          start: textareaRef.current?.selectionStart ?? 0,
          end: textareaRef.current?.selectionEnd ?? 0,
        })}
        onChange={(event) => handleChange(event.target.value)}
        readOnly={readOnly}
        spellCheck={false}
      />
    </div>
  );
}

function ImageEditorDriver({
  controller,
  commands,
  mode,
  voltPath,
  filePath,
  autofocus,
}: {
  controller: HostEditorController;
  commands: PluginEditorCommand[];
  mode: 'file-tab' | 'embedded';
  voltPath: string;
  filePath: string;
  autofocus: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const {
    zoom, dimensions, canvasRef, imgRef,
    handleImageLoad, zoomIn, zoomOut, zoomFit, zoomActual, resetZoom, zoomPercent,
  } = useImageZoom();
  const { dragging, handleMouseDown } = useImageDrag(canvasRef);

  useBuiltInEditorLifecycle(controller, commands, useMemo(() => new Map<string, CommandHandler>([
    ['focus', async () => {
      focusRef.current?.focus();
      return undefined;
    }],
  ]), []));

  useEffect(() => {
    controller.setFocusHandler(() => {
      focusRef.current?.focus();
    });
    controller.setSaveHandler(async () => undefined);
    controller.emit('ready', undefined);
    if (autofocus) {
      focusRef.current?.focus();
    }
    return () => {
      controller.setFocusHandler(null);
      controller.setSaveHandler(null);
    };
  }, [autofocus, controller]);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const dataUrl = await readImageBase64(voltPath, filePath);
        if (cancelled) {
          return;
        }
        const url = dataUrlToBlobUrl(dataUrl);
        revoke = url;
        setBlobUrl(url);
        resetZoom();
      } catch (error) {
        console.error('Failed to load image file:', error);
      }
    })();

    return () => {
      cancelled = true;
      if (revoke) {
        URL.revokeObjectURL(revoke);
      }
    };
  }, [filePath, resetZoom, voltPath]);

  const fileName = filePath.split('/').pop() ?? filePath;

  return (
    <div
      ref={focusRef}
      tabIndex={0}
      onFocus={() => controller.emit('focus', undefined)}
      onBlur={() => controller.emit('blur', undefined)}
      style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'column', outline: 'none' }}
    >
      {mode === 'file-tab' && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontWeight: 600 }}>{fileName}</span>
        {dimensions && <span style={{ opacity: 0.7 }}>{dimensions.w} x {dimensions.h}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={zoomOut}>-</button>
          <span>{zoomPercent}%</span>
          <button type="button" onClick={zoomIn}>+</button>
          <button type="button" onClick={zoomFit}>Fit</button>
          <button type="button" onClick={zoomActual}>1:1</button>
        </div>
      </div>
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: 'auto',
          cursor: dragging ? 'grabbing' : 'grab',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {blobUrl && (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <img
              ref={imgRef}
              src={blobUrl}
              onLoad={handleImageLoad}
              alt={fileName}
              draggable={false}
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function HostEditorSurface({
  pluginId,
  mode,
  voltId,
  voltPath,
  filePath,
  config,
  controller: externalController,
}: HostEditorSurfaceProps) {
  const localController = useMemo(
    () => externalController ?? new HostEditorController(pluginId, config.kind, filePath),
    [config.kind, externalController, filePath, pluginId],
  );

  useEffect(() => () => {
    if (!externalController) {
      localController.dispose();
    }
  }, [externalController, localController]);

  const content = (() => {
    switch (config.kind) {
      case 'markdown':
        return (
          <MarkdownEditorDriver
            controller={localController}
            commands={config.commands ?? []}
            mode={mode}
            voltId={voltId}
            voltPath={voltPath}
            filePath={filePath}
            readOnly={Boolean(config.readOnly)}
            autofocus={Boolean(config.autofocus)}
          />
        );
      case 'image':
        return (
          <ImageEditorDriver
            controller={localController}
            commands={config.commands ?? []}
            mode={mode}
            voltPath={voltPath}
            filePath={filePath}
            autofocus={Boolean(config.autofocus)}
          />
        );
      case 'raw-text':
      default:
        return (
          <RawTextEditorDriver
            controller={localController}
            commands={config.commands ?? []}
            mode={mode}
            voltId={voltId}
            voltPath={voltPath}
            filePath={filePath}
            readOnly={Boolean(config.readOnly)}
            autofocus={Boolean(config.autofocus)}
          />
        );
    }
  })();

  return (
    <HostEditorShell
      controller={localController}
      toolbarActions={config.toolbarActions ?? []}
      panels={config.panels ?? []}
      overlays={config.overlays ?? []}
    >
      {content}
    </HostEditorShell>
  );
}

export function listAvailableHostEditorKinds(): EditorKindInfo[] {
  return listHostEditorKinds();
}

export function getAvailableHostEditorCapabilities(kind: string): EditorKindCapabilities | null {
  return getHostEditorCapabilities(kind);
}

export function renderHostEditorFileSurface({
  pluginId,
  voltId,
  voltPath,
  filePath,
  config,
}: {
  pluginId?: string;
  voltId: string;
  voltPath: string;
  filePath: string;
  config: EditorMountConfig;
}) {
  return (
    <HostEditorSurface
      pluginId={pluginId}
      mode="file-tab"
      voltId={voltId}
      voltPath={voltPath}
      filePath={filePath}
      config={config}
    />
  );
}

export async function mountPluginHostEditor(
  pluginId: string,
  voltPath: string,
  container: HTMLElement,
  config: EditorMountConfig,
): Promise<EditorHandle> {
  const capabilities = getHostEditorCapabilities(config.kind);
  if (!capabilities) {
    throw reportPluginError(pluginId, `editor.mount:${config.kind}`, new Error(`Host editor kind "${config.kind}" is not available`));
  }

  if (!capabilities.supportsEmbeddedMount) {
    throw reportPluginError(pluginId, `editor.mount:${config.kind}`, new Error(`Host editor kind "${config.kind}" does not support embedded mount`));
  }

  const validationError = validateHostEditorConfig(config);
  if (validationError) {
    throw reportPluginError(pluginId, `editor.mount:${config.kind}`, new Error(validationError));
  }

  const controller = new HostEditorController(pluginId, config.kind, config.filePath);
  const root = createRoot(container);
  const tracker: MountTracker = { root, controller };
  controller.setDisposeCallback(() => {
    root.unmount();
    untrackMountedEditor(pluginId, tracker);
  });

  trackMountedEditor(pluginId, tracker);
  root.render(
    <HostEditorSurface
      pluginId={pluginId}
      mode="embedded"
      voltPath={voltPath}
      filePath={config.filePath}
      config={config}
      controller={controller}
    />,
  );

  return controller.handle;
}

export function cleanupPluginHostEditors(pluginId: string): void {
  Array.from(pluginMountedEditors.get(pluginId) ?? []).forEach((tracker) => {
    tracker.controller.dispose();
  });
}

export function cleanupAllHostEditors(): void {
  Array.from(pluginMountedEditors.keys()).forEach((pluginId) => {
    cleanupPluginHostEditors(pluginId);
  });
}

export function isRegisteredHostEditorViewerUsable(viewer: RegisteredHostEditorFileViewer): string | null {
  return validateHostEditorConfig(viewer.hostEditor);
}
