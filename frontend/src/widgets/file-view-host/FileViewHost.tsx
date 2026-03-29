import { useEffect, useMemo, useRef } from 'react';
import { getPathBasename } from '@app/lib/fileTree';
import { getFileExtension, isImagePath, isMarkdownPath } from '@app/lib/fileTypes';
import { safeExecute } from '@app/plugins/safeExecute';
import { usePluginRegistryStore, type RegisteredFileViewer } from '@app/plugins/pluginRegistry';
import { useActiveFileStore } from '@app/stores/activeFileStore';
import { useTabStore } from '@app/stores/tabStore';
import { EditorPanel } from '@widgets/editor-panel/EditorPanel';
import { ImageViewer } from '@widgets/image-viewer/ImageViewer';
import { RawTextEditor } from '@widgets/raw-text-editor/RawTextEditor';

interface FileViewHostProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

function resolveViewer(filePath: string, viewers: RegisteredFileViewer[]): RegisteredFileViewer | null {
  const extension = getFileExtension(filePath);
  if (!extension) {
    return null;
  }

  return viewers.find((viewer) => viewer.extensions.includes(extension)) ?? null;
}

function PluginFileViewerHost({
  viewer,
  voltId,
  voltPath,
  filePath,
}: {
  viewer: RegisteredFileViewer;
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
  const pluginViewer = useMemo(
    () => (filePath ? resolveViewer(filePath, fileViewers) : null),
    [filePath, fileViewers],
  );

  if (pluginViewer && filePath) {
    return (
      <PluginFileViewerHost
        viewer={pluginViewer}
        voltId={voltId}
        voltPath={voltPath}
        filePath={filePath}
      />
    );
  }

  if (filePath && isImagePath(filePath)) {
    return <ImageViewer voltPath={voltPath} filePath={filePath} />;
  }

  if (!filePath || isMarkdownPath(filePath)) {
    return <EditorPanel voltId={voltId} voltPath={voltPath} filePath={filePath} />;
  }

  return <RawTextEditor voltId={voltId} voltPath={voltPath} filePath={filePath} />;
}
