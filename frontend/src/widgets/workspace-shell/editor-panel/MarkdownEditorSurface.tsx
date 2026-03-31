import { useCallback, type ClipboardEventHandler, type DragEventHandler } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { useTabStore } from '@entities/tab';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import { isMarkdownPath } from '@shared/lib/fileTypes';
import {
  resolveRelativePath,
  getParentPath,
  getPathBasename,
  getEntryDisplayName,
} from '@shared/lib/fileTree';
import { TableBubbleMenu } from './extensions/TableBubbleMenu';
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
  const handleLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (!voltId) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http://') || href.startsWith('https://')) return;

      if (isMarkdownPath(href) || !href.includes('.')) {
        e.preventDefault();
        const resolved = resolveRelativePath(getParentPath(filePath), href);
        const resolvedPath = isMarkdownPath(resolved) ? resolved : `${resolved}.md`;
        const displayName = getEntryDisplayName(getPathBasename(resolvedPath), false);
        useTabStore.getState().openTab(voltId, resolvedPath, displayName);
      }
    },
    [voltId, filePath],
  );

  return (
    <div
      className={styles.panel}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      onClick={handleLinkClick}
    >
      {showTaskStatusBanner && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <div className={styles.editorContent}>
        {!readOnly && editor && <TextBubbleMenu editor={editor} />}
        {!readOnly && editor && <TableBubbleMenu editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
