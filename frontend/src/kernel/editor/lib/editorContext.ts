import type { Editor } from '@tiptap/react';
import { CellSelection, findCellPos, isInTable } from '@tiptap/pm/tables';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

export type EditorNodeKind =
  | 'emptyBlock'
  | 'text'
  | 'link'
  | 'table'
  | 'codeBlock'
  | 'image'
  | 'embed'
  | 'math'
  | 'blockquote'
  | 'list'
  | 'heading'
  | 'paragraph'
  | 'unknown';

export type EditorSelectionKind =
  | 'caret'
  | 'range'
  | 'node'
  | 'tableCell'
  | 'tableRow'
  | 'tableCol';

export interface EditorTableState {
  active: boolean;
  rowSelection: boolean;
  colSelection: boolean;
  cellSelection: boolean;
  anchorCellPos: number | null;
  cellBackgroundColor: string | null;
}

export interface EditorMenuContext {
  nodeKind: EditorNodeKind;
  selectionKind: EditorSelectionKind;
  isEditable: boolean;
  canInsert: boolean;
  canFormat: boolean;
  hasSelection: boolean;
  isInLink: boolean;
  linkHref: string | null;
  tableState: EditorTableState;
  targetPos: number | null;
  targetRect: DOMRect | null;
}

export interface EditorContextTargetOptions {
  target?: EventTarget | null;
  clientX?: number;
  clientY?: number;
}

const NATIVE_CONTEXT_MENU_SELECTOR = 'input, textarea, select, option, [data-native-context-menu="true"]';
const NODE_SELECTION_SELECTOR = 'img, .embed-block-node, .math-block-node';

export function isNativeContextMenuTarget(target: EventTarget | null) {
  const element = getTargetElement(target);
  return Boolean(element?.closest(NATIVE_CONTEXT_MENU_SELECTOR));
}

export function getEditorMenuContext(
  editor: Editor,
  { target, clientX, clientY }: EditorContextTargetOptions = {},
): EditorMenuContext {
  const resolvedTarget = target ?? null;
  const targetElement = getTargetElement(resolvedTarget);
  const selection = editor.state.selection;
  const tableState = getTableState(editor);
  const targetPos = resolveTargetPos(editor, targetElement, clientX, clientY);
  const targetRect = targetElement?.getBoundingClientRect() ?? null;
  const parent = selection.$from.parent;
  const isInLink = editor.isActive('link') || Boolean(targetElement?.closest('a[href]'));

  return {
    nodeKind: resolveNodeKind(editor, targetElement, tableState, isInLink, parent.textContent.trim().length === 0),
    selectionKind: resolveSelectionKind(selection, tableState),
    isEditable: editor.isEditable,
    canInsert: editor.isEditable,
    canFormat: editor.isEditable && !tableState.active,
    hasSelection: selection instanceof CellSelection || !selection.empty,
    isInLink,
    linkHref: editor.getAttributes('link').href ?? targetElement?.closest('a[href]')?.getAttribute('href') ?? null,
    tableState,
    targetPos,
    targetRect,
  };
}

export function ensureEditorSelectionForTarget(
  editor: Editor,
  { target, clientX, clientY }: EditorContextTargetOptions,
) {
  const resolvedTarget = target ?? null;
  const targetElement = getTargetElement(resolvedTarget);
  const selection = editor.state.selection;
  const tableState = getTableState(editor);
  const pos = resolveTargetPos(editor, targetElement, clientX, clientY);

  if (pos == null || isNativeContextMenuTarget(resolvedTarget)) {
    return;
  }

  if (selection instanceof CellSelection && tableState.active && targetElement?.closest('table')) {
    editor.view.focus();
    return;
  }

  if (selection.from <= pos && pos <= selection.to) {
    editor.view.focus();
    return;
  }

  const selectableNode = targetElement?.closest(NODE_SELECTION_SELECTOR);
  if (selectableNode) {
    const nodePos = resolvePosFromElement(editor, selectableNode);
    const node = nodePos == null ? null : editor.state.doc.nodeAt(nodePos);
    if (nodePos != null && node) {
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, nodePos)));
      editor.view.focus();
      return;
    }
  }

  const safePos = Math.max(0, Math.min(pos, editor.state.doc.content.size));
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, safePos)));
  editor.view.focus();
}

export function getEditorKeyboardMenuPosition(editor: Editor) {
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);

  return {
    x: coords.left + 8,
    y: coords.top + 8,
  };
}

function getTargetElement(target: EventTarget | null) {
  return target instanceof Element
    ? target
    : target instanceof Node
      ? target.parentElement
      : null;
}

function getTableState(editor: Editor): EditorTableState {
  const { selection } = editor.state;
  const anchorCellPos = resolveAnchorCellPos(editor);
  return {
    active: editor.isActive('table') || isInTable(editor.state) || anchorCellPos != null,
    rowSelection: selection instanceof CellSelection && selection.isRowSelection(),
    colSelection: selection instanceof CellSelection && selection.isColSelection(),
    cellSelection: selection instanceof CellSelection,
    anchorCellPos,
    cellBackgroundColor: editor.getAttributes('tableCell').backgroundColor
      ?? editor.getAttributes('tableHeader').backgroundColor
      ?? null,
  };
}

function resolveAnchorCellPos(editor: Editor) {
  const { selection, doc } = editor.state;

  if (selection instanceof CellSelection) {
    return selection.$anchorCell.pos;
  }

  try {
    return findCellPos(doc, selection.from)?.pos ?? null;
  } catch {
    return null;
  }
}

function resolveSelectionKind(selection: Editor['state']['selection'], tableState: EditorTableState): EditorSelectionKind {
  if (tableState.rowSelection) {
    return 'tableRow';
  }

  if (tableState.colSelection) {
    return 'tableCol';
  }

  if (selection instanceof CellSelection) {
    return 'tableCell';
  }

  if (selection instanceof NodeSelection) {
    return 'node';
  }

  if (!selection.empty) {
    return 'range';
  }

  return 'caret';
}

function resolveNodeKind(
  editor: Editor,
  targetElement: Element | null,
  tableState: EditorTableState,
  isInLink: boolean,
  isEmptyBlock: boolean,
): EditorNodeKind {
  if (tableState.active || targetElement?.closest('table')) {
    return 'table';
  }

  if (targetElement?.closest('.codeblock-wrapper, pre, code') || editor.isActive('codeBlock')) {
    return 'codeBlock';
  }

  if (targetElement?.closest('img') || editor.isActive('image')) {
    return 'image';
  }

  if (targetElement?.closest('.embed-block-node') || editor.isActive('embedBlock')) {
    return 'embed';
  }

  if (targetElement?.closest('.math-block-node') || editor.isActive('mathBlock')) {
    return 'math';
  }

  if (targetElement?.closest('blockquote') || editor.isActive('blockquote')) {
    return 'blockquote';
  }

  if (targetElement?.closest('li') || editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')) {
    return 'list';
  }

  if (targetElement?.closest('h1, h2, h3') || editor.isActive('heading')) {
    return 'heading';
  }

  if (isInLink) {
    return 'link';
  }

  if (isEmptyBlock) {
    return 'emptyBlock';
  }

  if (targetElement?.closest('p') || editor.isActive('paragraph')) {
    return 'paragraph';
  }

  return editor.state.selection.empty ? 'text' : 'unknown';
}

function resolveTargetPos(editor: Editor, targetElement: Element | null, clientX?: number, clientY?: number) {
  if (clientX != null && clientY != null) {
    const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
    if (coords?.pos != null) {
      return coords.pos;
    }
  }

  if (targetElement) {
    const nodeTarget = targetElement.closest('.ProseMirror *');
    if (nodeTarget) {
      const targetPos = resolvePosFromElement(editor, nodeTarget);
      if (targetPos != null) {
        return targetPos;
      }
    }
  }

  return editor.state.selection.from;
}

function resolvePosFromElement(editor: Editor, element: Element) {
  try {
    return editor.view.posAtDOM(element, 0);
  } catch {
    return null;
  }
}
