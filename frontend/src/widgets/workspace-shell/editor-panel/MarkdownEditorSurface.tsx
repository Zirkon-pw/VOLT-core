import type { ClipboardEventHandler, DragEventHandler } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import { TableBubbleMenu } from './extensions/TableBubbleMenu';
import { TextBubbleMenu } from './extensions/TextBubbleMenu';
import styles from './MarkdownEditorSurface.module.scss';

interface MarkdownEditorSurfaceProps {
  editor: Editor | null;
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
  voltPath,
  filePath,
  readOnly = false,
  showTaskStatusBanner = false,
  onDrop,
  onDragOver,
  onPaste,
}: MarkdownEditorSurfaceProps) {
  return (
    <div
      className={styles.panel}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
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
