import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Editor } from '@tiptap/react';
import { CellSelection, findCellPos } from '@tiptap/pm/tables';
import { NodeSelection } from '@tiptap/pm/state';
import { openExternalUrl } from '@shared/api/runtime/browser';
import { translate } from '@shared/i18n';
import { formatShortcutBinding } from '@shared/lib/hotkeys';
import { ColorPicker } from '@shared/ui/color-picker';
import { Icon } from '@shared/ui/icon';
import type { ContextMenuItem } from '@shared/ui/context-menu';
import sharedStyles from '@shared/ui/context-menu/view/ContextMenuView.module.scss';
import type { EditorMenuContext } from '../../lib/editorContext';
import styles from './EditorContextMenu.module.scss';

const CELL_COLOR_PRESETS = [
  { label: 'Paper', value: '#ece8de' },
  { label: 'Teal', value: '#d7eef1' },
  { label: 'Blue', value: '#dde8ef' },
  { label: 'Sage', value: '#dee8e1' },
  { label: 'Gold', value: '#ece3cf' },
  { label: 'Rose', value: '#ece1e2' },
  { label: 'Slate', value: '#e2e5e8' },
];

interface EditorContextMenuProps {
  editor: Editor;
  context: EditorMenuContext;
  position: { x: number; y: number };
  onClose: () => void;
}

interface EditorContextMenuItem extends ContextMenuItem {
  id: string;
  closeOnClick?: boolean;
}

export function EditorContextMenu({
  editor,
  context,
  position,
  onClose,
}: EditorContextMenuProps) {
  const [showCellColorPicker, setShowCellColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const items = useMemo(
    () => buildEditorContextMenuItems(editor, context, {
      showCellColorPicker,
      openCellColorPicker: () => setShowCellColorPicker(true),
      clearCellColor: () => applyCellColor(editor, context.targetPos, null),
    }),
    [context, editor, showCellColorPicker],
  );

  useEffect(() => {
    setShowCellColorPicker(false);
    setColorPickerPosition(null);
  }, [position]);

  useEffect(() => {
    setShowCellColorPicker(false);
    setColorPickerPosition(null);
  }, [context]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const maxLeft = Math.max(4, window.innerWidth - rect.width - 4);
    const maxTop = Math.max(4, window.innerHeight - rect.height - 4);
    menu.style.left = `${clamp(position.x, 4, maxLeft)}px`;
    menu.style.top = `${clamp(position.y, 4, maxTop)}px`;
  }, [items.length, position.x, position.y]);

  useLayoutEffect(() => {
    if (!showCellColorPicker) {
      setColorPickerPosition(null);
      return;
    }

    const anchor = itemRefs.current['table-cell-color'];
    const picker = colorPickerRef.current;
    if (!anchor || !picker) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const gap = 8;
    let left = anchorRect.right + gap;

    if (left + pickerRect.width > window.innerWidth - 8) {
      left = anchorRect.left - pickerRect.width - gap;
    }

    left = clamp(left, 8, Math.max(8, window.innerWidth - pickerRect.width - 8));
    const top = clamp(anchorRect.top, 8, Math.max(8, window.innerHeight - pickerRect.height - 8));

    setColorPickerPosition((current) => (
      current?.left === left && current?.top === top
        ? current
        : { left, top }
    ));
  }, [items.length, position.x, position.y, showCellColorPicker]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      if (showCellColorPicker) {
        setShowCellColorPicker(false);
        return;
      }
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, showCellColorPicker]);

  useEffect(() => {
    if (!showCellColorPicker) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (colorPickerRef.current?.contains(target) || itemRefs.current['table-cell-color']?.contains(target)) {
        return;
      }
      setShowCellColorPicker(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showCellColorPicker]);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={sharedStyles.overlay}
        data-testid="context-menu-overlay"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className={sharedStyles.menu}
        data-testid="context-menu"
        role="menu"
        style={{ left: position.x, top: position.y }}
      >
        {items.map((item) => {
          if (item.separator) {
            return <div key={item.id} className={sharedStyles.separator} />;
          }

          return (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[item.id] = node;
              }}
              type="button"
              className={[
                sharedStyles.item,
                item.danger ? sharedStyles.danger : '',
                item.active ? sharedStyles.active : '',
              ].filter(Boolean).join(' ')}
              data-testid="context-menu-item"
              disabled={item.disabled}
              role="menuitem"
              aria-label={item.ariaLabel ?? item.label}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                item.onClick();
                if (item.closeOnClick !== false) {
                  onClose();
                }
              }}
            >
              {item.icon && (
                <span className={sharedStyles.icon}>
                  <Icon name={item.icon} size={14} />
                </span>
              )}
              <span className={sharedStyles.label}>{item.label}</span>
              {item.shortcut && (
                <span className={sharedStyles.shortcut}>{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
      {showCellColorPicker && (
        <div
          ref={colorPickerRef}
          className={styles.colorPopover}
          data-testid="table-context-color-picker"
          style={{
            left: colorPickerPosition?.left ?? position.x,
            top: colorPickerPosition?.top ?? position.y,
            visibility: colorPickerPosition ? 'visible' : 'hidden',
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <ColorPicker
            value={context.tableState.cellBackgroundColor}
            onChange={(color) => applyCellColor(editor, context.targetPos, color)}
            onPresetClick={() => setShowCellColorPicker(false)}
            presets={CELL_COLOR_PRESETS}
          />
        </div>
      )}
    </>
  );
}

function buildEditorContextMenuItems(
  editor: Editor,
  context: EditorMenuContext,
  {
    showCellColorPicker,
    openCellColorPicker,
    clearCellColor,
  }: {
    showCellColorPicker: boolean;
    openCellColorPicker: () => void;
    clearCellColor: () => void;
  },
) {
  if (context.tableState.active || context.nodeKind === 'table') {
    return trimSeparators(buildTableItems(editor, context, {
      showCellColorPicker,
      openCellColorPicker,
      clearCellColor,
    }));
  }

  const items: EditorContextMenuItem[] = [];

  pushGroup(items, buildHistoryItems(editor));
  pushGroup(items, buildClipboardItems(editor));

  if (context.isInLink || context.nodeKind === 'link') {
    pushGroup(items, buildLinkItems(context));
  }

  pushGroup(items, buildNodeSpecificItems(editor, context));

  if (context.hasSelection && context.canFormat) {
    pushGroup(items, [{
      id: 'format-clear',
      label: translate('editor.context.clearFormatting'),
      icon: 'close',
      disabled: !editor.isEditable,
      onClick: () => {
        editor.chain().focus().unsetAllMarks().clearNodes().run();
      },
    }]);
  }

  return trimSeparators(items);
}

function buildHistoryItems(editor: Editor): EditorContextMenuItem[] {
  return [
    {
      id: 'history-undo',
      label: translate('common.undo'),
      icon: 'arrowLeft',
      shortcut: formatShortcutBinding('Mod+Z'),
      disabled: !editor.isEditable || !editor.can().chain().focus().undo().run(),
      onClick: () => {
        editor.chain().focus().undo().run();
      },
    },
    {
      id: 'history-redo',
      label: translate('common.redo'),
      icon: 'arrowRight',
      shortcut: formatShortcutBinding('Shift+Mod+Z'),
      disabled: !editor.isEditable || !editor.can().chain().focus().redo().run(),
      onClick: () => {
        editor.chain().focus().redo().run();
      },
    },
  ];
}

function buildClipboardItems(editor: Editor): EditorContextMenuItem[] {
  const selectionText = getSelectionText(editor);
  const canReadClipboard = Boolean(globalThis.navigator?.clipboard?.readText);
  const canWriteClipboard = Boolean(globalThis.navigator?.clipboard?.writeText);

  return [
    {
      id: 'clipboard-copy',
      label: translate('common.copy'),
      shortcut: formatShortcutBinding('Mod+C'),
      disabled: selectionText.length === 0 || !canWriteClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.writeText(selectionText);
      },
    },
    {
      id: 'clipboard-cut',
      label: translate('common.cut'),
      shortcut: formatShortcutBinding('Mod+X'),
      disabled: selectionText.length === 0 || !editor.isEditable || !canWriteClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.writeText(selectionText);
        editor.chain().focus().deleteSelection().run();
      },
    },
    {
      id: 'clipboard-paste',
      label: translate('common.paste'),
      shortcut: formatShortcutBinding('Mod+V'),
      disabled: !editor.isEditable || !canReadClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.readText().then((text) => {
          if (!text) {
            return;
          }
          editor.chain().focus().insertContent(text).run();
        });
      },
    },
    {
      id: 'clipboard-select-all',
      label: translate('common.selectAll'),
      shortcut: formatShortcutBinding('Mod+A'),
      disabled: !editor.can().chain().focus().selectAll().run(),
      onClick: () => {
        editor.chain().focus().selectAll().run();
      },
    },
  ];
}

function buildLinkItems(context: EditorMenuContext): EditorContextMenuItem[] {
  const href = context.linkHref ?? '';
  const items: EditorContextMenuItem[] = [
    {
      id: 'link-copy',
      label: translate('editor.context.copyLink'),
      icon: 'link',
      disabled: href.length === 0 || !globalThis.navigator?.clipboard?.writeText,
      onClick: () => {
        if (!href) {
          return;
        }
        void globalThis.navigator?.clipboard?.writeText(href);
      },
    },
  ];

  const isExternalLink = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href);
  if (isExternalLink) {
    items.push({
      id: 'link-open',
      label: translate('editor.context.openLink'),
      icon: 'arrowRight',
      disabled: href.length === 0,
      onClick: () => {
        if (!href) {
          return;
        }
        openExternalUrl(href);
      },
    });
  }

  return items;
}

function buildNodeSpecificItems(editor: Editor, context: EditorMenuContext): EditorContextMenuItem[] {
  const items: EditorContextMenuItem[] = [];

  if (context.nodeKind === 'codeBlock') {
    items.push({
      id: 'node-plain-text',
      label: translate('editor.context.plainText'),
      icon: 'file',
      disabled: !editor.isEditable || !editor.can().chain().focus().setParagraph().run(),
      onClick: () => {
        editor.chain().focus().setParagraph().run();
      },
    });
  }

  if (context.nodeKind === 'image' || context.nodeKind === 'embed' || context.nodeKind === 'math') {
    items.push({
      id: 'node-delete',
      label: translate('common.delete'),
      icon: 'trash',
      danger: true,
      disabled: !editor.isEditable || !editor.can().chain().focus().deleteSelection().run(),
      onClick: () => {
        editor.chain().focus().deleteSelection().run();
      },
    });
  }

  return items;
}

function buildTableItems(
  editor: Editor,
  context: EditorMenuContext,
  {
    showCellColorPicker,
    openCellColorPicker,
    clearCellColor,
  }: {
    showCellColorPicker: boolean;
    openCellColorPicker: () => void;
    clearCellColor: () => void;
  },
) {
  const items: EditorContextMenuItem[] = [];
  const targetPos = context.targetPos ?? context.tableState.anchorCellPos ?? editor.state.selection.from;
  const hasCellColor = context.tableState.cellBackgroundColor != null;

  pushGroup(items, [
    {
      id: 'table-select-row',
      label: translate('editor.table.selectRow'),
      icon: 'rows',
      disabled: !editor.isEditable,
      onClick: () => {
        selectTableAxis(editor, targetPos, 'row');
      },
    },
    {
      id: 'table-select-column',
      label: translate('editor.table.selectColumn'),
      icon: 'columns',
      disabled: !editor.isEditable,
      onClick: () => {
        selectTableAxis(editor, targetPos, 'col');
      },
    },
    {
      id: 'table-select-table',
      label: translate('editor.table.selectTable'),
      icon: 'table',
      disabled: !editor.isEditable,
      onClick: () => {
        selectWholeTable(editor, targetPos);
      },
    },
  ]);

  pushGroup(items, [
    {
      id: 'table-add-row-above',
      label: translate('editor.table.addRowAbove'),
      icon: 'rows',
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.addRowBefore());
      },
    },
    {
      id: 'table-add-row-below',
      label: translate('editor.table.addRowBelow'),
      icon: 'rows',
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.addRowAfter());
      },
    },
    {
      id: 'table-add-column-left',
      label: translate('editor.table.addColumnBefore'),
      icon: 'columns',
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.addColumnBefore());
      },
    },
    {
      id: 'table-add-column-right',
      label: translate('editor.table.addColumnAfter'),
      icon: 'columns',
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.addColumnAfter());
      },
    },
  ]);

  pushGroup(items, [
    {
      id: 'table-delete-row',
      label: translate('editor.table.deleteRow'),
      icon: 'rows',
      danger: true,
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.deleteRow());
      },
    },
    {
      id: 'table-delete-column',
      label: translate('editor.table.deleteColumn'),
      icon: 'columns',
      danger: true,
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.deleteColumn());
      },
    },
    {
      id: 'table-delete-table',
      label: translate('editor.table.deleteTable'),
      icon: 'trash',
      danger: true,
      disabled: !editor.isEditable,
      onClick: () => {
        runTableCommandAt(editor, targetPos, (chain) => chain.deleteTable());
      },
    },
  ]);

  const colorItems: EditorContextMenuItem[] = [
    {
      id: 'table-cell-color',
      label: `${translate('editor.table.cellColor')}...`,
      icon: 'paintBucket',
      active: showCellColorPicker,
      disabled: !editor.isEditable,
      closeOnClick: false,
      onClick: () => {
        openCellColorPicker();
      },
    },
    ...(hasCellColor
      ? [{
          id: 'table-clear-cell-color',
          label: translate('editor.table.clearCellColor'),
          icon: 'close',
          disabled: !editor.isEditable,
          onClick: () => {
            clearCellColor();
          },
        } satisfies EditorContextMenuItem]
      : []),
  ];

  pushGroup(items, colorItems);

  return items;
}

function pushGroup(target: EditorContextMenuItem[], group: EditorContextMenuItem[]) {
  const filtered = group.filter((item) => item.separator || item.label.length > 0);
  if (filtered.length === 0) {
    return;
  }

  if (target.length > 0) {
    target.push({ id: `separator-${target.length}`, label: '', separator: true, onClick: () => {} });
  }

  target.push(...filtered);
}

function trimSeparators(items: EditorContextMenuItem[]) {
  return items.filter((item, index) => {
    if (!item.separator) {
      return true;
    }

    const prev = items[index - 1];
    const next = items[index + 1];
    return Boolean(prev && next && !prev.separator && !next.separator);
  });
}

function getSelectionText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, ' ').trim();
}

function applyCellColor(editor: Editor, targetPos: number | null, color: string | null) {
  const { selection } = editor.state;
  if (selection instanceof CellSelection) {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
  } else {
    runTableCommandAt(editor, targetPos, (chain) => chain.setCellAttribute('backgroundColor', color));
  }
}

function selectTableAxis(editor: Editor, pos: number, axis: 'row' | 'col') {
  try {
    const $cell = findCellPos(editor.state.doc, pos);
    if (!$cell) {
      return;
    }

    const selection = axis === 'row'
      ? CellSelection.rowSelection($cell)
      : CellSelection.colSelection($cell);

    editor.view.dispatch(editor.state.tr.setSelection(selection));
    editor.view.focus();
  } catch {
    editor.chain().focus().run();
  }
}

function selectWholeTable(editor: Editor, pos: number) {
  const tableElement = findTableElementAtPos(editor, pos);
  if (!tableElement) {
    editor.chain().focus().run();
    return;
  }

  try {
    const tablePos = editor.view.posAtDOM(tableElement, 0);
    const tableNode = editor.state.doc.nodeAt(tablePos);
    if (!tableNode) {
      editor.chain().focus().run();
      return;
    }

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, tablePos)));
    editor.view.focus();
  } catch {
    editor.chain().focus().run();
  }
}

function runTableCommandAt(
  editor: Editor,
  targetPos: number | null,
  command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
) {
  const resolvedSelectionPos = resolveTableCommandSelectionPos(editor, targetPos);
  let chain = editor.chain().focus();

  if (resolvedSelectionPos != null) {
    chain = chain.setTextSelection(resolvedSelectionPos);
  }

  command(chain).run();
}

function resolveTableCommandSelectionPos(editor: Editor, targetPos: number | null) {
  const fallbackPos = targetPos ?? editor.state.selection.from;

  try {
    const $cell = findCellPos(editor.state.doc, fallbackPos);
    if (!$cell) {
      return null;
    }

    return Math.min(editor.state.doc.content.size, $cell.pos + 1);
  } catch {
    return null;
  }
}

function findTableElementAtPos(editor: Editor, pos: number) {
  try {
    const domAtPos = editor.view.domAtPos(pos);
    const element = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
    return element?.closest('table') ?? null;
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
