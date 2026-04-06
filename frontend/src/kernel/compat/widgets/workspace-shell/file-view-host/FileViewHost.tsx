import { useEffect, useMemo, useRef } from 'react';
import { useActiveFileStore } from '@entities/editor-session';
import { usePluginRegistryStore, type RegisteredCustomFileViewer } from '@entities/plugin';
import { useTabStore } from '@entities/tab';
import { getPathBasename } from '@shared/lib/fileTree';
import { safeExecute } from '@shared/lib/plugin-runtime';
import { resolveFileViewTarget } from '@shared/lib/plugin-runtime/fileViewResolution';
import {
  isRegisteredHostEditorViewerUsable,
  renderHostEditorFileSurface,
} from '@shared/lib/plugin-runtime/hostEditorService';
import { EditorPanel } from '../editor-panel/EditorPanel';

interface FileViewHostProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

function PluginFileViewerHost({
  viewer,
  voltId,
  voltPath,
  filePath,
}: {
  viewer: RegisteredCustomFileViewer;
  voltId: string;
  voltPath: string;
  filePath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const unregisterSaveHandlerRef = useRef<(() => void) | null>(null);
  const registerSaveHandler = useActiveFileStore((state) => state.registerSaveHandler);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const context = {
      voltId,
      voltPath,
      filePath,
      fileName: getPathBasename(filePath),
      setDirty: (dirty: boolean) => {
        useTabStore.getState().setDirty(voltId, filePath, dirty);
      },
      registerSaveHandler: (handler: () => Promise<void>) => {
        unregisterSaveHandlerRef.current?.();
        const unregister = registerSaveHandler(voltId, filePath, handler);
        unregisterSaveHandlerRef.current = unregister;
        return () => {
          unregister();
          if (unregisterSaveHandlerRef.current === unregister) {
            unregisterSaveHandlerRef.current = null;
          }
        };
      },
    };

    container.innerHTML = '';
    safeExecute(viewer.pluginId, `fileViewer:${viewer.id}:render`, () => {
      viewer.render(container, context);
    });

    return () => {
      unregisterSaveHandlerRef.current?.();
      unregisterSaveHandlerRef.current = null;
      viewer.cleanup?.();
      container.innerHTML = '';
    };
  }, [filePath, registerSaveHandler, viewer, voltId, voltPath]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
}

export function FileViewHost({ voltId, voltPath, filePath }: FileViewHostProps) {
  const fileViewers = usePluginRegistryStore((state) => state.fileViewers);
  const target = useMemo(
    () => (filePath ? resolveFileViewTarget(filePath, fileViewers) : null),
    [filePath, fileViewers],
  );

  if (!filePath) {
    return <EditorPanel voltId={voltId} voltPath={voltPath} filePath={filePath} />;
  }

  if (!target) {
    return renderHostEditorFileSurface({
      voltId,
      voltPath,
      filePath,
      config: { kind: 'raw-text', filePath },
    });
  }

  if (target.type === 'plugin-custom') {
    return (
      <PluginFileViewerHost
        viewer={target.viewer}
        voltId={voltId}
        voltPath={voltPath}
        filePath={filePath}
      />
    );
  }

  if (target.type === 'plugin-host-editor') {
    const error = isRegisteredHostEditorViewerUsable(target.viewer);
    if (error) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {error}
        </div>
      );
    }

    return renderHostEditorFileSurface({
      pluginId: target.viewer.pluginId,
      voltId,
      voltPath,
      filePath,
      config: {
        ...target.viewer.hostEditor,
        filePath,
      },
    });
  }

  if (target.type === 'builtin' && target.kind === 'markdown') {
    return <EditorPanel voltId={voltId} voltPath={voltPath} filePath={filePath} />;
  }

  return renderHostEditorFileSurface({
    voltId,
    voltPath,
    filePath,
    config: { kind: target.kind, filePath },
  });
}
