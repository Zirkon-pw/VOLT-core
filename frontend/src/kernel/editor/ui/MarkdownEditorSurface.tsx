import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEventHandler,
  type DragEventHandler,
} from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { getFileTreeServiceStore } from '@kernel/services/fileTreeService';
import { openFileInActivePane, openFileInSecondaryPane } from '@kernel/workspace/panes/model';
import { PluginTaskStatusBanner } from '@kernel/plugin-system/ui/task-status';
import { getFileExtension } from '@shared/lib/fileTypes';
import {
  findEntryByPath,
  resolveRelativePath,
  getParentPath,
  getPathBasename,
  getEntryDisplayName,
} from '@shared/lib/fileTree';
import { openExternalUrl } from '@shared/api/runtime/browser';
import { DragHandle } from './extensions/DragHandle';
import { EditorContextMenu } from './extensions/EditorContextMenu';
import { TableControls } from './extensions/TableControls';
import { TextBubbleMenu } from './extensions/TextBubbleMenu';
import { useEditorResponsiveMode } from '../hooks/useEditorResponsiveMode';
import {
  ensureEditorSelectionForTarget,
  getEditorKeyboardMenuPosition,
  getEditorMenuContext,
  isNativeContextMenuTarget,
  type EditorMenuContext,
} from '../lib/editorContext';
import styles from './MarkdownEditorSurface.module.scss';

interface MarkdownEditorSurfaceProps {
  editor: Editor | null;
  voltId?: string;
  voltPath: string;
  filePath: string;
  readOnly?: boolean;
  showTaskStatusBanner?: boolean;
  onScrollContainerChange?: (element: HTMLDivElement | null) => void;
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
  onScrollContainerChange,
  onDrop,
  onDragOver,
  onPaste,
}: MarkdownEditorSurfaceProps) {
  const [editorContentElement, setEditorContentElement] = useState<HTMLDivElement | null>(null);
  const [overlayElement, setOverlayElement] = useState<HTMLDivElement | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    context: EditorMenuContext;
    position: { x: number; y: number };
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastSurfaceTargetRef = useRef<EventTarget | null>(null);
  const responsiveMode = useEditorResponsiveMode({ element: editorContentElement });

  const isWithinEditorSurfaceTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) {
      return false;
    }

    return Boolean(
      (editorContentElement && editorContentElement.contains(target))
      || (overlayElement && overlayElement.contains(target)),
    );
  }, [editorContentElement, overlayElement]);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const openContextMenu = useCallback((position: { x: number; y: number }, target: EventTarget | null) => {
    if (!editor || !isWithinEditorSurfaceTarget(target) || isNativeContextMenuTarget(target)) {
      return;
    }

    lastSurfaceTargetRef.current = target;
    ensureEditorSelectionForTarget(editor, {
      target,
      clientX: position.x,
      clientY: position.y,
    });

    setContextMenuState({
      context: getEditorMenuContext(editor, {
        target,
        clientX: position.x,
        clientY: position.y,
      }),
      position,
    });
  }, [editor, isWithinEditorSurfaceTarget]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPointRef.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  useEffect(() => {
    if (!editor || contextMenuState == null) {
      return undefined;
    }

    const handleSelectionChange = () => {
      if (contextMenuState.context.tableState.active) {
        const nextContext = getEditorMenuContext(editor, {
          target: lastSurfaceTargetRef.current,
        });
        if (nextContext.tableState.active) {
          return;
        }
      }
      closeContextMenu();
    };

    const handleResize = () => {
      closeContextMenu();
    };

    editor.on('selectionUpdate', handleSelectionChange);
    window.addEventListener('resize', handleResize);

    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [closeContextMenu, contextMenuState, editor]);

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
        openExternalUrl(href);
        return;
      }

      if (href.startsWith('#') && editor) {
        const headingId = decodeURIComponent(href.slice(1)).toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        let targetPos: number | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (targetPos !== null) return false;
          if (node.type.name === 'heading') {
            const slug = node.textContent.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            if (slug === headingId) {
              targetPos = pos;
              return false;
            }
          }
        });
        if (targetPos !== null) {
          editor.chain().focus().setTextSelection(targetPos + 1).run();
          const domAtPos = editor.view.domAtPos(targetPos + 1);
          const element = domAtPos.node instanceof HTMLElement
            ? domAtPos.node
            : domAtPos.node.parentElement;
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      if (!voltId) return;

      const normalizedHref = decodeURIComponent(href.split(/[?#]/, 1)[0] ?? href);
      if (!normalizedHref) {
        return;
      }

      const resolvedPath = resolveRelativePath(getParentPath(filePath), normalizedHref);
      const tree = getFileTreeServiceStore().trees[voltId] ?? [];
      const markdownFallbackPath = getFileExtension(resolvedPath) ? resolvedPath : `${resolvedPath}.md`;
      const targetPath = findEntryByPath(tree, resolvedPath)
        ? resolvedPath
        : findEntryByPath(tree, markdownFallbackPath)
          ? markdownFallbackPath
          : resolvedPath;
      const displayName = getEntryDisplayName(getPathBasename(targetPath), false);

      const shouldOpenSecondary = e.metaKey || e.ctrlKey;
      if (shouldOpenSecondary) {
        openFileInSecondaryPane(voltId, targetPath, displayName);
      } else {
        openFileInActivePane(voltId, targetPath, displayName);
      }
    },
    [voltId, filePath],
  );

  const handleEditorAreaClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || readOnly) return;
    const target = event.target as HTMLElement;
    if (target.closest('.ProseMirror')) return;

    const pmElement = editorContentElement?.querySelector('.ProseMirror') as HTMLElement | null;
    if (!pmElement) return;

    const pmRect = pmElement.getBoundingClientRect();
    const clampedX = Math.min(Math.max(event.clientX, pmRect.left + 1), pmRect.right - 1);
    const clampedY = Math.min(Math.max(event.clientY, pmRect.top + 1), pmRect.bottom - 1);

    const pos = editor.view.posAtCoords({ left: clampedX, top: clampedY });
    if (pos) {
      editor.chain().focus().setTextSelection(pos.pos).run();
    } else {
      editor.chain().focus().setTextSelection(editor.state.doc.content.size).run();
    }
  }, [editor, editorContentElement, readOnly]);

  const panelProps = useMemo(() => ({
    'data-editor-mode': responsiveMode,
  }), [responsiveMode]);

  const handleEditorContentRef = useCallback((node: HTMLDivElement | null) => {
    setEditorContentElement(node);
    onScrollContainerChange?.(node);
  }, [onScrollContainerChange]);

  return (
    <div
      className={styles.panel}
      data-testid="markdown-editor-surface"
      {...panelProps}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      onClickCapture={handleLinkClick}
      onContextMenu={(event) => {
        if (!isWithinEditorSurfaceTarget(event.target) || isNativeContextMenuTarget(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        openContextMenu({ x: event.clientX, y: event.clientY }, event.target);
      }}
      onKeyDownCapture={(event) => {
        if (!editor || isNativeContextMenuTarget(event.target) || !isWithinEditorSurfaceTarget(event.target)) {
          return;
        }

        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        editor.view.focus();
        const domSelectionTarget = document.getSelection()?.anchorNode ?? null;
        const lastSurfaceTarget = isWithinEditorSurfaceTarget(lastSurfaceTargetRef.current)
          ? lastSurfaceTargetRef.current
          : null;
        const selectionTarget = lastSurfaceTarget
          ?? (isWithinEditorSurfaceTarget(domSelectionTarget) ? domSelectionTarget : event.target);
        ensureEditorSelectionForTarget(editor, {
          target: selectionTarget,
        });
        const keyboardPosition = getEditorKeyboardMenuPosition(editor);
        const keyboardTarget = document.elementFromPoint(keyboardPosition.x, keyboardPosition.y);
        const resolvedKeyboardTarget = isWithinEditorSurfaceTarget(keyboardTarget) ? keyboardTarget : selectionTarget;
        setContextMenuState({
          context: getEditorMenuContext(editor, {
            target: resolvedKeyboardTarget,
            clientX: keyboardPosition.x,
            clientY: keyboardPosition.y,
          }),
          position: keyboardPosition,
        });
      }}
      onPointerDownCapture={(event) => {
        if (!isWithinEditorSurfaceTarget(event.target) || isNativeContextMenuTarget(event.target)) {
          if (responsiveMode === 'touch') {
            clearLongPress();
          }
          return;
        }

        lastSurfaceTargetRef.current = event.target;
        if (responsiveMode !== 'touch' || event.pointerType === 'mouse') {
          clearLongPress();
          return;
        }

        longPressTriggeredRef.current = false;
        clearLongPress();
        longPressPointRef.current = { x: event.clientX, y: event.clientY };
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          openContextMenu({ x: event.clientX, y: event.clientY }, event.target);
        }, 420);
      }}
      onPointerMoveCapture={(event) => {
        if (responsiveMode !== 'touch' || longPressPointRef.current == null) {
          return;
        }

        const deltaX = Math.abs(event.clientX - longPressPointRef.current.x);
        const deltaY = Math.abs(event.clientY - longPressPointRef.current.y);
        if (deltaX > 12 || deltaY > 12) {
          clearLongPress();
        }
      }}
      onPointerUpCapture={() => {
        clearLongPress();
      }}
      onPointerCancelCapture={() => {
        clearLongPress();
      }}
    >
      {editor && (
        <TextBubbleMenu editor={editor} mode={responsiveMode} />
      )}
      {showTaskStatusBanner && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <div
        ref={handleEditorContentRef}
        className={styles.editorContent}
        data-testid="editor-content-scroll"
        onClick={handleEditorAreaClick}
      >
        <EditorContent editor={editor} />
      </div>
      {editor && contextMenuState && (
        <EditorContextMenu
          editor={editor}
          context={contextMenuState.context}
          position={contextMenuState.position}
          onClose={closeContextMenu}
        />
      )}
      {!readOnly && editor && (
        <div ref={setOverlayElement} className={styles.editorOverlay}>
          <TableControls
            editor={editor}
            scrollContainer={editorContentElement}
            overlayContainer={overlayElement}
            mode={responsiveMode}
          />
          <DragHandle
            editor={editor}
            scrollContainer={editorContentElement}
            overlayContainer={overlayElement}
          />
        </div>
      )}
    </div>
  );
}
