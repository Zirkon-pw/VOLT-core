import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { CellSelection, findCellPos, isInTable, selectedRect } from '@tiptap/pm/tables';
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
  overlayContainer: HTMLElement | null;
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

interface CellInfo {
  table: HTMLTableElement;
  cell: HTMLTableCellElement;
  cellPos: number;
  rowIndex: number;
  colIndex: number;
}

interface SelectionTarget {
  type: 'row' | 'col';
  left: number;
  top: number;
  width: number;
  height: number;
  cellPos: number;
  active: boolean;
}

interface AxisSelectionState {
  rowSelection: boolean;
  colSelection: boolean;
  rect: ReturnType<typeof selectedRect>;
}

export function TableControls({ editor, scrollContainer, overlayContainer }: TableControlsProps) {
  const { t } = useI18n();
  const [addHandles, setAddHandles] = useState<HandlePos[]>([]);
  const [handlesVisible, setHandlesVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null);
  const [selectionTargets, setSelectionTargets] = useState<SelectionTarget[]>([]);
  const [showColors, setShowColors] = useState(false);
  const rafRef = useRef<number>(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const stopInteraction = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const closeColorPicker = useCallback((restoreEditorFocus = false) => {
    setShowColors(false);
    if (restoreEditorFocus) {
      editor.chain().focus().run();
    }
  }, [editor]);

  const getContainer = useCallback(
    () => scrollContainer ?? editor.view.dom.parentElement,
    [editor.view.dom.parentElement, scrollContainer],
  );

  const updatePositions = useCallback((hoveredCell?: CellInfo | null) => {
    const selectedTable = editor.isActive('table') ? findTableElement(editor) : null;
    const selectedCell = editor.isActive('table') ? findSelectedCell(editor) : null;
    const tableNode = hoveredCell?.table ?? selectedCell?.table ?? selectedTable;
    const overlay = overlayContainer;

    if (!tableNode || !overlay) {
      setAddHandles([]);
      setHandlesVisible(false);
      setToolbarPos(null);
      setSelectionTargets([]);
      setShowColors(false);
      return;
    }

    const overlayRect = overlay.getBoundingClientRect();
    const tableRect = tableNode.getBoundingClientRect();
    const isVisible = !(
      tableRect.bottom < overlayRect.top
      || tableRect.top > overlayRect.bottom
      || tableRect.right < overlayRect.left
      || tableRect.left > overlayRect.right
    );

    if (!isVisible) {
      setAddHandles([]);
      setHandlesVisible(false);
      setToolbarPos(null);
      setSelectionTargets([]);
      setShowColors(false);
      return;
    }

    const overlayWidth = overlay.clientWidth;
    const overlayHeight = overlay.clientHeight;

    setAddHandles([
      {
        type: 'col',
        left: clamp(tableRect.right - overlayRect.left, 10, Math.max(10, overlayWidth - 10)),
        top: clamp(
          tableRect.top + tableRect.height / 2 - overlayRect.top,
          10,
          Math.max(10, overlayHeight - 10),
        ),
      },
      {
        type: 'row',
        left: clamp(
          tableRect.left + tableRect.width / 2 - overlayRect.left,
          10,
          Math.max(10, overlayWidth - 10),
        ),
        top: clamp(tableRect.bottom - overlayRect.top, 10, Math.max(10, overlayHeight - 10)),
      },
    ]);
    setHandlesVisible(Boolean(hoveredCell) || Boolean(selectedTable));

    const axisSelection = getAxisSelectionState(editor);
    const targetCell = hoveredCell ?? selectedCell;
    if (targetCell) {
      setSelectionTargets(buildSelectionTargets(targetCell, overlayRect, axisSelection));
    } else {
      setSelectionTargets([]);
    }

    if (!selectedTable) {
      setToolbarPos(null);
      setShowColors(false);
      return;
    }

    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 308;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
    const containerWidth = overlay.clientWidth;
    const containerHeight = overlay.clientHeight;
    const minAnchorLeft = toolbarWidth + 12;
    const maxAnchorLeft = Math.max(minAnchorLeft, containerWidth - 12);
    const anchorLeft = tableRect.right - overlayRect.left;

    setToolbarPos({
      left: Math.min(Math.max(anchorLeft, minAnchorLeft), maxAnchorLeft),
      top: clamp(
        tableRect.top - overlayRect.top,
        toolbarHeight + 12,
        Math.max(toolbarHeight + 12, containerHeight - 12),
      ),
    });
  }, [editor, overlayContainer]);

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
    window.addEventListener('resize', handleScroll);

    return () => {
      editor.off('selectionUpdate', syncControls);
      editor.off('update', syncControls);
      container?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, getContainer, updatePositions]);

  useEffect(() => {
    const container = getContainer();
    if (!container) {
      return undefined;
    }

    const handleMouseMove = (event: PointerEvent) => {
      const hoveredCell = getCellAtCoords(editor, event.clientX, event.clientY);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updatePositions(hoveredCell));
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
      closeColorPicker(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeColorPicker(true);
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

  const selectAxis = useCallback((type: 'row' | 'col', cellPos: number) => {
    try {
      const $cell = findCellPos(editor.state.doc, cellPos);
      if (!$cell) {
        editor.chain().focus().run();
        return;
      }
      const selection = type === 'row'
        ? CellSelection.rowSelection($cell)
        : CellSelection.colSelection($cell);
      editor.view.dispatch(editor.state.tr.setSelection(selection));
      editor.view.focus();
    } catch {
      editor.chain().focus().run();
    }
  }, [editor]);

  const currentCellColor = editor.getAttributes('tableCell').backgroundColor
    ?? editor.getAttributes('tableHeader').backgroundColor
    ?? null;

  if (addHandles.length === 0 && !toolbarPos && selectionTargets.length === 0) {
    return null;
  }

  return (
    <>
      {selectionTargets.map((target) => (
        <button
          key={target.type}
          type="button"
          data-testid={`table-select-${target.type}`}
          className={`${styles.selectionTarget} ${target.type === 'row' ? styles.selectionTargetRow : styles.selectionTargetCol} ${target.active ? styles.selectionTargetActive : ''}`}
          style={{
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
          }}
          onMouseDown={stopInteraction}
          onClick={() => selectAxis(target.type, target.cellPos)}
          title={target.type === 'row' ? 'Select row' : 'Select column'}
        >
          <Icon name={target.type === 'row' ? 'rows' : 'columns'} size={12} />
        </button>
      ))}

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
                onPresetClick={() => closeColorPicker()}
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

function findSelectedCell(editor: Editor): CellInfo | null {
  const selection = editor.state.selection;
  if (selection instanceof CellSelection) {
    const cellDom = editor.view.nodeDOM(selection.$anchorCell.pos);
    if (cellDom instanceof HTMLTableCellElement) {
      return buildCellInfo(editor, cellDom);
    }
  }

  const pos = selection instanceof CellSelection ? selection.$anchorCell.pos : selection.$anchor.pos;
  const cell = findCellElementAtPos(editor, pos);
  return cell ? buildCellInfo(editor, cell) : null;
}

function getCellAtCoords(editor: Editor, clientX: number, clientY: number): CellInfo | null {
  const element = document.elementFromPoint(clientX, clientY);
  const cell = element instanceof HTMLElement ? element.closest('td,th') : null;
  if (!(cell instanceof HTMLTableCellElement)) {
    return null;
  }

  return buildCellInfo(editor, cell);
}

function findCellElementAtPos(editor: Editor, pos: number): HTMLTableCellElement | null {
  const domAtPos = editor.view.domAtPos(pos);
  const element = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
  const cell = element?.closest('td,th');
  return cell instanceof HTMLTableCellElement ? cell : null;
}

function buildCellInfo(editor: Editor, cell: HTMLTableCellElement): CellInfo | null {
  const table = cell.closest('table');
  const row = cell.parentElement;
  if (!(table instanceof HTMLTableElement) || !(row instanceof HTMLTableRowElement)) {
    return null;
  }

  if (!editor.view.dom.contains(table)) {
    return null;
  }

  const cellPos = getCellPos(editor, cell);
  if (cellPos == null) {
    return null;
  }

  return {
    table,
    cell,
    cellPos,
    rowIndex: Array.from(table.rows).indexOf(row),
    colIndex: Array.from(row.cells).indexOf(cell),
  };
}

function getCellPos(editor: Editor, cell: HTMLTableCellElement): number | null {
  try {
    return editor.view.posAtDOM(cell, 0);
  } catch {
    return null;
  }
}

function getAxisSelectionState(editor: Editor): AxisSelectionState | null {
  const { selection } = editor.state;
  if (!(selection instanceof CellSelection) || !isInTable(editor.state)) {
    return null;
  }

  return {
    rowSelection: selection.isRowSelection(),
    colSelection: selection.isColSelection(),
    rect: selectedRect(editor.state),
  };
}

function buildSelectionTargets(
  cellInfo: CellInfo,
  overlayRect: DOMRect,
  axisSelection: AxisSelectionState | null,
): SelectionTarget[] {
  const tableRect = cellInfo.table.getBoundingClientRect();
  const cellRect = cellInfo.cell.getBoundingClientRect();
  const rowActive = Boolean(
    axisSelection?.rowSelection
    && cellInfo.rowIndex >= axisSelection.rect.top
    && cellInfo.rowIndex < axisSelection.rect.bottom,
  );
  const colActive = Boolean(
    axisSelection?.colSelection
    && cellInfo.colIndex >= axisSelection.rect.left
    && cellInfo.colIndex < axisSelection.rect.right,
  );

  return [
    {
      type: 'col',
      left: Math.max(6, cellRect.left - overlayRect.left),
      top: Math.max(6, tableRect.top - overlayRect.top - 18),
      width: Math.max(22, cellRect.width),
      height: 14,
      cellPos: cellInfo.cellPos,
      active: colActive,
    },
    {
      type: 'row',
      left: Math.max(6, tableRect.left - overlayRect.left - 18),
      top: Math.max(6, cellRect.top - overlayRect.top),
      width: 14,
      height: Math.max(22, cellRect.height),
      cellPos: cellInfo.cellPos,
      active: rowActive,
    },
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
