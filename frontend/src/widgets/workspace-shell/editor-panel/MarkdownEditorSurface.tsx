import { useCallback, useRef, type ClipboardEventHandler, type DragEventHandler } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { useFileTreeStore } from '@entities/file-tree';
import { useTabStore } from '@entities/tab';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import { getFileExtension } from '@shared/lib/fileTypes';
import {
  findEntryByPath,
  resolveRelativePath,
  getParentPath,
  getPathBasename,
  getEntryDisplayName,
} from '@shared/lib/fileTree';
import { BrowserOpenURL } from '../../../../wailsjs/runtime/runtime';
import { DragHandle } from './extensions/DragHandle';
import { TableControls } from './extensions/TableControls';
import { TextBubbleMenu } from './extensions/TextBubbleMenu';
import styles from './MarkdownEditorSurface.module.scss';

interface MarkdownEditorSurfaceProps {
  editor: Editor | null;
  voltId?: string;
  voltPath: string;
  filePath: string;
  readOnly?: boolean;
  showTaskStatusBanner?: boolean;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onPaste?: ClipboardEventHandler<HTMLDivElement>;
}

export function MarkdownEditorSurface({
  editor,
  voltId,
  voltPath,
  filePath,
  readOnly = false,
  showTaskStatusBanner = false,
  onDrop,
  onDragOver,
  onPaste,
}: MarkdownEditorSurfaceProps) {
  const editorContentRef = useRef<HTMLDivElement>(null);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target;
      const anchor = target instanceof Element
        ? target.closest('a[href]')
        : target instanceof Node
          ? target.parentElement?.closest('a[href]')
          : null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      const isExternalLink = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)
        || /^[a-z][a-z0-9+.-]*:/i.test(href);

      e.preventDefault();
      e.stopPropagation();

      if (isExternalLink) {
        BrowserOpenURL(href);
        return;
      }

      if (!voltId || href.startsWith('#')) return;

      const normalizedHref = decodeURIComponent(href.split(/[?#]/, 1)[0] ?? href);
      if (!normalizedHref) {
        return;
      }

      const resolvedPath = resolveRelativePath(getParentPath(filePath), normalizedHref);
      const tree = useFileTreeStore.getState().trees[voltId] ?? [];
      const markdownFallbackPath = getFileExtension(resolvedPath) ? resolvedPath : `${resolvedPath}.md`;
      const targetPath = findEntryByPath(tree, resolvedPath)
        ? resolvedPath
        : findEntryByPath(tree, markdownFallbackPath)
          ? markdownFallbackPath
          : resolvedPath;
      const displayName = getEntryDisplayName(getPathBasename(targetPath), false);

      useTabStore.getState().openTab(
        voltId,
        targetPath,
        displayName,
      );
    },
    [voltId, filePath],
  );

  return (
    <div
      className={styles.panel}
      data-testid="markdown-editor-surface"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      onClickCapture={handleLinkClick}
    >
      {showTaskStatusBanner && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <div ref={editorContentRef} className={styles.editorContent}>
        {!readOnly && editor && <TextBubbleMenu editor={editor} />}
        {!readOnly && editor && (
          <TableControls editor={editor} scrollContainer={editorContentRef.current} />
        )}
        {!readOnly && editor && (
          <DragHandle editor={editor} scrollContainer={editorContentRef.current} />
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
