import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@shared/ui/icon';
import type { EditorResponsiveMode } from '../hooks/useEditorResponsiveMode';
import styles from './TableControls.module.scss';

interface TableControlsProps {
  editor: Editor;
  scrollContainer: HTMLElement | null;
  overlayContainer: HTMLElement | null;
  mode: EditorResponsiveMode;
}

interface HandlePos {
  type: 'row' | 'col';
  left: number;
  top: number;
}

const TOUCH_HANDLE_INSET = 18;
const POINTER_HANDLE_INSET = 12;

export function TableControls({ editor, scrollContainer, overlayContainer, mode }: TableControlsProps) {
  const { t } = useI18n();
  const [addHandles, setAddHandles] = useState<HandlePos[]>([]);
  const rafRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedOverlayRef = useRef<HTMLElement | null>(null);
  const observedWrapperRef = useRef<HTMLElement | null>(null);
  const observedTableRef = useRef<HTMLTableElement | null>(null);

  const stopInteraction = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const getContainer = useCallback(
    () => scrollContainer ?? editor.view.dom.parentElement,
    [editor.view.dom.parentElement, scrollContainer],
  );

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const overlay = overlayContainer;
      const container = getContainer();
      const table = editor.isActive('table') ? findTableElement(editor) : null;
      const wrapper = table ? findTableWrapper(table) : null;

      syncObservedElements({
        editor,
        overlay,
        scheduleUpdate,
        resizeObserverRef,
        observedOverlayRef,
        observedWrapperRef,
        observedTableRef,
        wrapper,
        table,
      });

      if (!overlay || !table) {
        setAddHandles([]);
        return;
      }

      const overlayRect = overlay.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const visibleRect = getVisibleTableRect(tableRect, [
        overlayRect,
        container?.getBoundingClientRect() ?? null,
        wrapper?.getBoundingClientRect() ?? null,
      ]);

      if (visibleRect == null) {
        setAddHandles([]);
        return;
      }

      const inset = mode === 'touch' ? TOUCH_HANDLE_INSET : POINTER_HANDLE_INSET;
      const maxLeft = Math.max(inset, overlay.clientWidth - inset);
      const maxTop = Math.max(inset, overlay.clientHeight - inset);

      setAddHandles([
        {
          type: 'col',
          left: clamp(visibleRect.right - overlayRect.left, inset, maxLeft),
          top: clamp((visibleRect.top + visibleRect.bottom) / 2 - overlayRect.top, inset, maxTop),
        },
        {
          type: 'row',
          left: clamp((visibleRect.left + visibleRect.right) / 2 - overlayRect.left, inset, maxLeft),
          top: clamp(visibleRect.bottom - overlayRect.top, inset, maxTop),
        },
      ]);
    });
  }, [editor, mode, overlayContainer]);

  useEffect(() => {
    const syncControls = () => {
      scheduleUpdate();
    };

    editor.on('selectionUpdate', syncControls);
    editor.on('update', syncControls);

    const handleScroll = () => {
      scheduleUpdate();
    };
    const handleDocumentScroll = (event: Event) => {
      const target = event.target;
      if (target === container) {
        return;
      }

      if (target instanceof Node && editor.view.dom.contains(target)) {
        scheduleUpdate();
      }
    };

    const container = getContainer();
    container?.addEventListener('scroll', handleScroll, { passive: true });
    editor.view.dom.ownerDocument.addEventListener('scroll', handleDocumentScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll);

    scheduleUpdate();

    return () => {
      editor.off('selectionUpdate', syncControls);
      editor.off('update', syncControls);
      container?.removeEventListener('scroll', handleScroll);
      editor.view.dom.ownerDocument.removeEventListener('scroll', handleDocumentScroll, true);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, getContainer, scheduleUpdate]);

  useEffect(() => {
    scheduleUpdate();
  }, [scheduleUpdate]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    observedOverlayRef.current = null;
    observedWrapperRef.current = null;
    observedTableRef.current = null;
  }, []);

  const appendTableAxis = useCallback((type: 'row' | 'col') => {
    const table = findTableElement(editor);
    const targetCell = table ? findAppendTargetCell(table, type) : null;
    const selectionPos = targetCell ? getSelectionPosForCell(editor, targetCell) : null;

    if (selectionPos == null) {
      editor.chain().focus().run();
      return;
    }

    const chain = editor.chain().focus().setTextSelection(selectionPos);
    if (type === 'col') {
      chain.addColumnAfter().run();
    } else {
      chain.addRowAfter().run();
    }
  }, [editor]);

  if (addHandles.length === 0) {
    return null;
  }

  return (
    <>
      {addHandles.map((handle) => (
        <button
          key={handle.type}
          type="button"
          data-testid={`table-add-${handle.type}`}
          className={[
            styles.addHandle,
            mode === 'touch' ? styles.addHandleTouch : '',
          ].filter(Boolean).join(' ')}
          style={{
            left: handle.left,
            top: handle.top,
          }}
          onMouseDown={stopInteraction}
          onClick={() => appendTableAxis(handle.type)}
          title={handle.type === 'col' ? t('editor.table.addColumnAfter') : t('editor.table.addRowBelow')}
        >
          <Icon name="plus" size={12} />
        </button>
      ))}
    </>
  );
}

function syncObservedElements({
  editor,
  overlay,
  scheduleUpdate,
  resizeObserverRef,
  observedOverlayRef,
  observedWrapperRef,
  observedTableRef,
  wrapper,
  table,
}: {
  editor: Editor;
  overlay: HTMLElement | null;
  scheduleUpdate: () => void;
  resizeObserverRef: MutableRefObject<ResizeObserver | null>;
  observedOverlayRef: MutableRefObject<HTMLElement | null>;
  observedWrapperRef: MutableRefObject<HTMLElement | null>;
  observedTableRef: MutableRefObject<HTMLTableElement | null>;
  wrapper: HTMLElement | null;
  table: HTMLTableElement | null;
}) {
  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  if (!resizeObserverRef.current) {
    resizeObserverRef.current = new ResizeObserver(() => {
      scheduleUpdate();
    });
  }

  const observer = resizeObserverRef.current;
  const nextOverlay = overlay ?? null;

  if (observedOverlayRef.current !== nextOverlay) {
    if (observedOverlayRef.current) {
      observer.unobserve(observedOverlayRef.current);
    }
    if (nextOverlay) {
      observer.observe(nextOverlay);
    }
    observedOverlayRef.current = nextOverlay;
  }

  if (observedWrapperRef.current !== wrapper) {
    if (observedWrapperRef.current) {
      observer.unobserve(observedWrapperRef.current);
    }
    if (wrapper && editor.view.dom.contains(wrapper)) {
      observer.observe(wrapper);
    }
    observedWrapperRef.current = wrapper;
  }

  if (observedTableRef.current !== table) {
    if (observedTableRef.current) {
      observer.unobserve(observedTableRef.current);
    }
    if (table && editor.view.dom.contains(table)) {
      observer.observe(table);
    }
    observedTableRef.current = table;
  }
}

function findTableElement(editor: Editor): HTMLTableElement | null {
  const { $anchor } = editor.state.selection;
  const domAtPos = editor.view.domAtPos($anchor.pos);
  const element = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
  return element?.closest('table') ?? null;
}

function findTableWrapper(table: HTMLTableElement): HTMLElement | null {
  return table.closest('.tableWrapper');
}

function findAppendTargetCell(table: HTMLTableElement, type: 'row' | 'col') {
  const rows = Array.from(table.rows).filter((row) => row.cells.length > 0);
  if (rows.length === 0) {
    return null;
  }

  if (type === 'col') {
    const firstPopulatedRow = rows.find((row) => row.cells.length > 0);
    return firstPopulatedRow ? firstPopulatedRow.cells[firstPopulatedRow.cells.length - 1] : null;
  }

  const lastRow = rows[rows.length - 1];
  return lastRow?.cells[0] ?? null;
}

function getSelectionPosForCell(editor: Editor, cell: HTMLTableCellElement) {
  try {
    return Math.min(editor.state.doc.content.size, editor.view.posAtDOM(cell, 0) + 1);
  } catch {
    return null;
  }
}

function getVisibleTableRect(tableRect: DOMRect, clipRects: Array<DOMRect | null>) {
  let left = tableRect.left;
  let right = tableRect.right;
  let top = tableRect.top;
  let bottom = tableRect.bottom;

  for (const rect of clipRects) {
    if (!rect) {
      continue;
    }

    left = Math.max(left, rect.left);
    right = Math.min(right, rect.right);
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
  }

  if (right <= left || bottom <= top) {
    return null;
  }

  return { left, right, top, bottom };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
