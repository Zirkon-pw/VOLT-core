import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Icon } from '@shared/ui/icon';
import styles from './DragHandle.module.scss';

const DRAGGABLE_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
  'table',
  'image',
  'horizontalRule',
  'mathBlock',
]);

interface DragHandleProps {
  editor: Editor;
  scrollContainer: HTMLElement | null;
}

interface HandleState {
  top: number;
  left: number;
  nodePos: number;
  visible: boolean;
}

interface DropIndicatorState {
  top: number;
  left: number;
  width: number;
  visible: boolean;
}

interface DragSession {
  nodePos: number;
  node: ProseMirrorNode;
  dropPos: number | null;
  domElement: HTMLElement | null;
}

export function DragHandle({ editor, scrollContainer }: DragHandleProps) {
  const [handle, setHandle] = useState<HandleState>({ top: 0, left: 0, nodePos: -1, visible: false });
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const rafRef = useRef<number>(0);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const isDragging = useRef(false);
  const hideTimeoutRef = useRef<number>(0);

  const hideHandle = useCallback(() => {
    setHandle((current) => (current.visible ? { ...current, visible: false } : current));
  }, []);

  const clearDragState = useCallback(() => {
    const session = dragSessionRef.current;
    session?.domElement?.classList.remove('dragLiftedBlock');
    dragSessionRef.current = null;
    isDragging.current = false;
    setDropIndicator(null);
    document.body.classList.remove(styles.dragActiveBody);
  }, []);

  const getContainer = useCallback(
    () => scrollContainer ?? editor.view.dom.parentElement,
    [editor.view.dom.parentElement, scrollContainer],
  );

  const updateHandle = useCallback(
    (clientX: number, clientY: number) => {
      if (isDragging.current) {
        return;
      }

      const view = editor.view;
      if (!view?.dom) {
        return;
      }

      const pos = view.posAtCoords({ left: clientX, top: clientY });
      if (!pos) {
        const editorRect = view.dom.getBoundingClientRect();
        if (clientX >= editorRect.left - 40 && clientX <= editorRect.left + 10) {
          return;
        }
        hideHandle();
        return;
      }

      try {
        const $pos = view.state.doc.resolve(pos.pos);
        const depth = Math.min($pos.depth, 1);
        if (depth < 1) {
          hideHandle();
          return;
        }

        const nodePos = $pos.before(1);
        const node = view.state.doc.nodeAt(nodePos);
        if (!node || !DRAGGABLE_TYPES.has(node.type.name)) {
          hideHandle();
          return;
        }

        const dom = view.nodeDOM(nodePos);
        if (!(dom instanceof HTMLElement)) {
          hideHandle();
          return;
        }

        const domRect = dom.getBoundingClientRect();
        const container = getContainer();
        const scrollRect = container?.getBoundingClientRect();
        const scrollTop = container?.scrollTop ?? 0;
        const scrollLeft = container?.scrollLeft ?? 0;
        const containerTop = scrollRect?.top ?? 0;
        const containerLeft = scrollRect?.left ?? 0;
        const left = Math.max(domRect.left - containerLeft + scrollLeft - 24, 4);

        setHandle({
          top: domRect.top - containerTop + scrollTop,
          left,
          nodePos,
          visible: true,
        });
      } catch {
        hideHandle();
      }
    },
    [editor.view, getContainer, hideHandle],
  );

  const updateDropIndicator = useCallback(
    (clientX: number, clientY: number) => {
      const dragSession = dragSessionRef.current;
      if (!dragSession) {
        return;
      }

      const target = getTopLevelNodeAtCoords(editor.view, clientX, clientY);
      if (!target) {
        dragSession.dropPos = null;
        setDropIndicator(null);
        return;
      }

      const rawInsertPos = getInsertionPos(target, clientY);
      const adjustedInsertPos = dragSession.nodePos < rawInsertPos
        ? rawInsertPos - dragSession.node.nodeSize
        : rawInsertPos;

      dragSession.dropPos = adjustedInsertPos;

      if (adjustedInsertPos === dragSession.nodePos) {
        setDropIndicator(null);
        return;
      }

      const rect = target.dom.getBoundingClientRect();
      const container = getContainer();
      const scrollRect = container?.getBoundingClientRect();
      const scrollTop = container?.scrollTop ?? 0;
      const scrollLeft = container?.scrollLeft ?? 0;
      const containerTop = scrollRect?.top ?? 0;
      const containerLeft = scrollRect?.left ?? 0;
      const insertAfter = rawInsertPos > target.nodePos;

      setDropIndicator({
        top: (insertAfter ? rect.bottom : rect.top) - containerTop + scrollTop,
        left: rect.left - containerLeft + scrollLeft,
        width: rect.width,
        visible: true,
      });
    },
    [editor.view, getContainer],
  );

  const maybeAutoScroll = useCallback((clientY: number) => {
    const container = getContainer();
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const threshold = 32;
    const step = 18;

    if (clientY < rect.top + threshold) {
      container.scrollBy({ top: -step });
    } else if (clientY > rect.bottom - threshold) {
      container.scrollBy({ top: step });
    }
  }, [getContainer]);

  const finishDrag = useCallback(() => {
    const dragSession = dragSessionRef.current;
    if (!dragSession) {
      clearDragState();
      return;
    }

    const { view } = editor;
    if (dragSession.dropPos != null && dragSession.dropPos !== dragSession.nodePos) {
      const tr = view.state.tr
        .delete(dragSession.nodePos, dragSession.nodePos + dragSession.node.nodeSize)
        .insert(dragSession.dropPos, dragSession.node);
      tr.setSelection(NodeSelection.create(tr.doc, dragSession.dropPos));
      tr.scrollIntoView();
      view.dispatch(tr);
    }

    clearDragState();
    hideHandle();
  }, [clearDragState, editor, hideHandle]);

  useEffect(() => {
    const container = getContainer();
    const eventTarget = container ?? editor.view.dom;

    const onMouseMove = (event: PointerEvent) => {
      clearTimeout(hideTimeoutRef.current);

      if (handleRef.current?.contains(event.target as Node)) {
        return;
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updateHandle(event.clientX, event.clientY));
    };

    const onMouseLeave = (event: PointerEvent) => {
      if (handleRef.current?.contains(event.relatedTarget as Node) || isDragging.current) {
        return;
      }

      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = window.setTimeout(hideHandle, 150);
    };

    const onWindowMouseMove = (event: PointerEvent) => {
      if (!isDragging.current) {
        return;
      }

      event.preventDefault();
      maybeAutoScroll(event.clientY);
      updateDropIndicator(event.clientX, event.clientY);
    };

    const onWindowMouseUp = () => {
      if (!isDragging.current) {
        return;
      }

      finishDrag();
    };

    eventTarget.addEventListener('pointermove', onMouseMove);
    eventTarget.addEventListener('pointerleave', onMouseLeave);
    window.addEventListener('pointermove', onWindowMouseMove);
    window.addEventListener('pointerup', onWindowMouseUp);

    const handleScroll = () => {
      if (isDragging.current) {
        return;
      }

      hideHandle();
    };

    container?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      eventTarget.removeEventListener('pointermove', onMouseMove);
      eventTarget.removeEventListener('pointerleave', onMouseLeave);
      window.removeEventListener('pointermove', onWindowMouseMove);
      window.removeEventListener('pointerup', onWindowMouseUp);
      container?.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(hideTimeoutRef.current);
      clearDragState();
    };
  }, [
    clearDragState,
    editor.view.dom,
    finishDrag,
    getContainer,
    hideHandle,
    maybeAutoScroll,
    updateDropIndicator,
    updateHandle,
  ]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (handle.nodePos < 0) {
      return;
    }

    const { state, view } = editor;
    const node = state.doc.nodeAt(handle.nodePos);
    if (!node) {
      return;
    }

    const dom = view.nodeDOM(handle.nodePos);
    const domElement = dom instanceof HTMLElement ? dom : null;
    domElement?.classList.add('dragLiftedBlock');

    dragSessionRef.current = {
      nodePos: handle.nodePos,
      node,
      dropPos: null,
      domElement,
    };
    isDragging.current = true;
    document.body.classList.add(styles.dragActiveBody);

    view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, handle.nodePos)));
    updateDropIndicator(event.clientX, event.clientY);
  }, [editor, handle.nodePos, updateDropIndicator]);

  if (!handle.visible && !dropIndicator?.visible) {
    return null;
  }

  return (
    <>
      {handle.visible && (
        <div
          ref={handleRef}
          data-testid="editor-drag-handle"
          className={`${styles.dragHandle} ${isDragging.current ? styles.dragHandleActive : ''}`}
          style={{ top: handle.top, left: handle.left }}
          onPointerDown={handlePointerDown}
        >
          <Icon name="gripVertical" size={14} />
        </div>
      )}

      {dropIndicator?.visible && (
        <div
          className={styles.dropIndicator}
          data-testid="editor-drop-indicator"
          style={{
            top: dropIndicator.top,
            left: dropIndicator.left,
            width: dropIndicator.width,
          }}
        />
      )}
    </>
  );
}

function getTopLevelNodeAtCoords(
  view: Editor['view'],
  clientX: number,
  clientY: number,
): { nodePos: number; node: ProseMirrorNode; dom: HTMLElement } | null {
  const pos = view.posAtCoords({ left: clientX, top: clientY });
  if (!pos) {
    return null;
  }

  try {
    const $pos = view.state.doc.resolve(pos.pos);
    if ($pos.depth < 1) {
      return null;
    }

    const nodePos = $pos.before(1);
    const node = view.state.doc.nodeAt(nodePos);
    const dom = view.nodeDOM(nodePos);

    if (!node || !(dom instanceof HTMLElement) || !DRAGGABLE_TYPES.has(node.type.name)) {
      return null;
    }

    return { nodePos, node, dom };
  } catch {
    return null;
  }
}

function getInsertionPos(
  target: { nodePos: number; node: ProseMirrorNode; dom: HTMLElement },
  clientY: number,
) {
  const rect = target.dom.getBoundingClientRect();
  const shouldInsertAfter = clientY > rect.top + rect.height / 2;
  return shouldInsertAfter ? target.nodePos + target.node.nodeSize : target.nodePos;
}
