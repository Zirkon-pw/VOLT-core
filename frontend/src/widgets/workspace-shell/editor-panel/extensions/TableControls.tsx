import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useI18n } from '@app/providers/I18nProvider';
import { ColorPicker } from '@shared/ui/color-picker';
import { Icon } from '@shared/ui/icon';
import styles from './TableControls.module.scss';

const CELL_COLORS = [
  { label: 'None', value: null },
  { label: 'Gray', value: '#f3f4f6' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Red', value: '#fee2e2' },
  { label: 'Purple', value: '#f3e8ff' },
  { label: 'Rose', value: '#ffe4e6' },
];

interface TableControlsProps {
  editor: Editor;
  scrollContainer: HTMLElement | null;
}

interface HandlePos {
  type: 'row' | 'col';
  left: number;
  top: number;
}

interface ToolbarPos {
  left: number;
  top: number;
}

export function TableControls({ editor, scrollContainer }: TableControlsProps) {
  const { t } = useI18n();
  const [addHandles, setAddHandles] = useState<HandlePos[]>([]);
  const [handlesVisible, setHandlesVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null);
  const [showColors, setShowColors] = useState(false);
  const rafRef = useRef<number>(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const stopInteraction = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const closeColorPicker = useCallback(() => {
    setShowColors(false);
  }, []);

  const getContainer = useCallback(
    () => scrollContainer ?? editor.view.dom.parentElement,
    [editor.view.dom.parentElement, scrollContainer],
  );

  const updatePositions = useCallback((hoveredTable?: HTMLTableElement | null) => {
    const selectedTable = editor.isActive('table') ? findTableElement(editor) : null;
    const tableNode = hoveredTable ?? selectedTable;

    if (!tableNode) {
      setAddHandles([]);
      setHandlesVisible(false);
      setToolbarPos(null);
      setShowColors(false);
      return;
    }

    const container = getContainer();
    const scrollRect = container?.getBoundingClientRect();
    const scrollOffset = container
      ? { x: container.scrollLeft, y: container.scrollTop }
      : { x: 0, y: 0 };
    const containerTop = scrollRect?.top ?? 0;
    const containerLeft = scrollRect?.left ?? 0;
    const tableRect = tableNode.getBoundingClientRect();

    setAddHandles([
      {
        type: 'col',
        left: tableRect.right - containerLeft + scrollOffset.x,
        top: tableRect.top + tableRect.height / 2 - containerTop + scrollOffset.y,
      },
      {
        type: 'row',
        left: tableRect.left + tableRect.width / 2 - containerLeft + scrollOffset.x,
        top: tableRect.bottom - containerTop + scrollOffset.y,
      },
    ]);
    setHandlesVisible(Boolean(hoveredTable) || Boolean(selectedTable));

    if (!selectedTable) {
      setToolbarPos(null);
      setShowColors(false);
      return;
    }

    setToolbarPos({
      left: tableRect.right - containerLeft + scrollOffset.x,
      top: tableRect.top - containerTop + scrollOffset.y,
    });
  }, [editor, getContainer]);

  useEffect(() => {
    const syncControls = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updatePositions());
    };

    editor.on('selectionUpdate', syncControls);
    editor.on('update', syncControls);

    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updatePositions());
    };

    const container = getContainer();
    container?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      editor.off('selectionUpdate', syncControls);
      editor.off('update', syncControls);
      container?.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, getContainer, updatePositions]);

  useEffect(() => {
    const container = getContainer();
    if (!container) {
      return undefined;
    }

    const handleMouseMove = (event: PointerEvent) => {
      const hoveredTable = getTableAtCoords(editor, event.clientX, event.clientY);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updatePositions(hoveredTable));
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updatePositions(null));
    };

    container.addEventListener('pointermove', handleMouseMove);
    container.addEventListener('pointerleave', handleMouseLeave);

    return () => {
      container.removeEventListener('pointermove', handleMouseMove);
      container.removeEventListener('pointerleave', handleMouseLeave);
    };
  }, [editor, getContainer, updatePositions]);

  useEffect(() => {
    if (!showColors) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }
      closeColorPicker();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeColorPicker();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeColorPicker, showColors]);

  const runTableCommand = useCallback((command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => {
    command(editor.chain().focus()).run();
  }, [editor]);

  const applyColor = useCallback((color: string | null) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
  }, [editor]);

  const currentCellColor = editor.getAttributes('tableCell').backgroundColor
    ?? editor.getAttributes('tableHeader').backgroundColor
    ?? null;

  if (addHandles.length === 0 && !toolbarPos) {
    return null;
  }

  return (
    <>
      {addHandles.map((handle) => (
        <button
          key={handle.type}
          type="button"
          data-testid={`table-add-${handle.type}`}
          className={`${styles.addHandle} ${handle.type === 'row' ? styles.addHandleRow : styles.addHandleCol}`}
          style={{
            left: handle.left,
            top: handle.top,
            opacity: handlesVisible ? 1 : 0,
            pointerEvents: handlesVisible ? 'auto' : 'none',
          }}
          onMouseDown={stopInteraction}
          onClick={() => {
            if (handle.type === 'col') {
              runTableCommand((chain) => chain.addColumnAfter());
            } else {
              runTableCommand((chain) => chain.addRowAfter());
            }
          }}
          title={handle.type === 'col' ? t('editor.table.addColumnAfter') : t('editor.table.addRowBelow')}
        >
          <Icon name="plus" size={12} />
        </button>
      ))}

      {toolbarPos && (
        <div
          ref={toolbarRef}
          className={styles.toolbar}
          data-testid="table-toolbar"
          style={{ left: toolbarPos.left, top: toolbarPos.top }}
        >
          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.actionBtn}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.addColumnBefore())}
              title={t('editor.table.addColumnBefore')}
            >
              {t('editor.table.short.addColumnBefore')}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.addColumnAfter())}
              title={t('editor.table.addColumnAfter')}
            >
              {t('editor.table.short.addColumnAfter')}
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.deleteColumn())}
              title={t('editor.table.deleteColumn')}
            >
              {t('editor.table.short.deleteColumn')}
            </button>
          </div>

          <div className={styles.toolbarDivider} />

          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.actionBtn}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.addRowBefore())}
              title={t('editor.table.addRowAbove')}
            >
              {t('editor.table.short.addRowAbove')}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.addRowAfter())}
              title={t('editor.table.addRowBelow')}
            >
              {t('editor.table.short.addRowBelow')}
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.deleteRow())}
              title={t('editor.table.deleteRow')}
            >
              {t('editor.table.short.deleteRow')}
            </button>
          </div>

          <div className={styles.toolbarDivider} />

          <div className={styles.toolbarGroup}>
            <button
              type="button"
              data-testid="table-toolbar-cell-color"
              className={`${styles.iconBtn} ${showColors ? styles.iconBtnActive : ''}`}
              onMouseDown={stopInteraction}
              onClick={() => setShowColors((current) => !current)}
              title={t('editor.table.cellColor')}
            >
              <Icon name="paintBucket" size={12} />
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onMouseDown={stopInteraction}
              onClick={() => runTableCommand((chain) => chain.deleteTable())}
              title={t('editor.table.deleteTable')}
            >
              {t('editor.table.short.deleteTable')}
            </button>
          </div>

          {showColors && (
            <div className={styles.colorPanel} data-testid="table-toolbar-color-picker">
              <ColorPicker
                value={currentCellColor}
                onChange={applyColor}
                onPresetClick={closeColorPicker}
                presets={CELL_COLORS}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function findTableElement(editor: Editor): HTMLTableElement | null {
  const { $anchor } = editor.state.selection;
  const domAtPos = editor.view.domAtPos($anchor.pos);
  const element = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
  return element?.closest('table') ?? null;
}

function getTableAtCoords(editor: Editor, clientX: number, clientY: number): HTMLTableElement | null {
  const element = document.elementFromPoint(clientX, clientY);
  const table = element instanceof HTMLElement ? element.closest('table') : null;
  if (!table) {
    return null;
  }

  return editor.view.dom.contains(table) ? table : null;
}
