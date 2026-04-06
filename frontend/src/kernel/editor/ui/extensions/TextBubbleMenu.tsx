import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useI18n } from '@app/providers/I18nProvider';
import { ensureExplicitRelativePath } from '@shared/lib/fileTree';
import { ColorPicker } from '@shared/ui/color-picker';
import { Icon } from '@shared/ui/icon';
import type { EditorResponsiveMode } from '../../hooks/useEditorResponsiveMode';
import styles from './TextBubbleMenu.module.scss';

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Graphite', value: '#2e343b' },
  { label: 'Teal', value: '#239dad' },
  { label: 'Blue', value: '#5d7f9f' },
  { label: 'Sage', value: '#5f8778' },
  { label: 'Gold', value: '#9b7a42' },
  { label: 'Rose', value: '#9b6666' },
  { label: 'Plum', value: '#7b7195' },
  { label: 'Slate', value: '#6d767e' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: null },
  { label: 'Paper', value: '#ece8de' },
  { label: 'Teal', value: '#d7eef1' },
  { label: 'Blue', value: '#dde8ef' },
  { label: 'Sage', value: '#dee8e1' },
  { label: 'Gold', value: '#ece3cf' },
  { label: 'Rose', value: '#ece1e2' },
];

interface TextBubbleMenuProps {
  editor: Editor;
  mode: EditorResponsiveMode;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z][\w-]*(\.[a-zA-Z]{2,})(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return ensureExplicitRelativePath(trimmed);
}

export function TextBubbleMenu({ editor, mode }: TextBubbleMenuProps) {
  const { t } = useI18n();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [, setRevision] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const shouldShow = useCallback(({ editor: ed, element }: { editor: Editor; element: HTMLElement }) => {
    if (ed.isActive('table')) {
      return false;
    }

    const hasSelection = ed.state.selection.content().size > 0;
    const isInteractingWithMenu = element.contains(document.activeElement);

    return hasSelection || showLinkInput || showColors || showHighlight || isInteractingWithMenu;
  }, [showColors, showHighlight, showLinkInput]);

  const handleToolbarMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const rememberSelection = useCallback(() => {
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
  }, [editor]);

  const restoreSelection = useCallback(() => {
    const saved = savedSelectionRef.current;
    if (!saved) {
      editor.chain().focus().run();
      return;
    }

    try {
      editor.chain().focus().setTextSelection(saved).run();
    } catch {
      editor.chain().focus().run();
    }
  }, [editor]);

  const closeTransientPanels = useCallback(({ restoreEditorFocus = false }: { restoreEditorFocus?: boolean } = {}) => {
    setShowColors(false);
    setShowHighlight(false);
    setShowLinkInput(false);
    setLinkUrl('');
    if (restoreEditorFocus) {
      restoreSelection();
    }
    savedSelectionRef.current = null;
  }, [restoreSelection]);

  useEffect(() => {
    const notifyUpdate = () => {
      setRevision((current) => current + 1);
    };

    editor.on('selectionUpdate', notifyUpdate);
    editor.on('update', notifyUpdate);

    return () => {
      editor.off('selectionUpdate', notifyUpdate);
      editor.off('update', notifyUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!showLinkInput && !showColors && !showHighlight) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      closeTransientPanels({ restoreEditorFocus: true });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTransientPanels({ restoreEditorFocus: true });
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeTransientPanels, showColors, showHighlight, showLinkInput]);

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();

  const openLinkInput = () => {
    rememberSelection();
    const existingUrl = editor.getAttributes('link').href ?? '';
    setLinkUrl(existingUrl);
    setShowLinkInput(true);
    setShowColors(false);
    setShowHighlight(false);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const applyLink = () => {
    const url = normalizeUrl(linkUrl);
    if (!url) {
      removeLink();
      return;
    }

    const saved = savedSelectionRef.current;
    if (saved) {
      editor.chain().focus().setTextSelection(saved).setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    savedSelectionRef.current = null;
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const removeLink = () => {
    const saved = savedSelectionRef.current;
    if (saved) {
      editor.chain().focus().setTextSelection(saved).unsetLink().run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    savedSelectionRef.current = null;
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeTransientPanels({ restoreEditorFocus: true });
    }
  };

  const setColor = (color: string | null) => {
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
  };

  const setHighlight = (color: string | null) => {
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
  };

  const toggleColorsPanel = () => {
    if (!showColors) {
      rememberSelection();
    }
    setShowColors((v) => !v);
    setShowHighlight(false);
    setShowLinkInput(false);
  };

  const toggleHighlightPanel = () => {
    if (!showHighlight) {
      rememberSelection();
    }
    setShowHighlight((v) => !v);
    setShowColors(false);
    setShowLinkInput(false);
  };

  const currentColor = editor.getAttributes('textStyle').color ?? null;
  const currentHighlight = editor.getAttributes('highlight').color ?? null;

  const menuClassName = [
    styles.menu,
    mode !== 'desktop' ? styles.menuCompact : '',
  ].filter(Boolean).join(' ');

  const menuBody = (
    <div ref={menuRef} className={menuClassName} data-testid="text-bubble-menu">
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('bold') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleBold}
          title="Bold"
        >
          <Icon name="bold" size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('italic') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleItalic}
          title="Italic"
        >
          <Icon name="italic" size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('underline') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleUnderline}
          title="Underline"
        >
          <span className={styles.underlineIcon}>U</span>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('strike') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleStrike}
          title="Strikethrough"
        >
          <Icon name="strikethrough" size={14} />
        </button>
        <button
          type="button"
          data-testid="text-bubble-inline-code"
          className={`${styles.btn} ${editor.isActive('code') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleCode}
          title={t('editor.bubble.inlineCode')}
        >
          <Icon name="code" size={14} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('link') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={openLinkInput}
          title="Link"
        >
          <Icon name="link" size={14} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={`${styles.btn} ${showColors || currentColor ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleColorsPanel}
          title="Text color"
        >
          <span className={styles.colorIndicator} style={{ borderBottomColor: currentColor ?? 'var(--color-text-primary)' }}>
            A
          </span>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${showHighlight || editor.isActive('highlight') ? styles.btnActive : ''}`}
          onMouseDown={handleToolbarMouseDown}
          onClick={toggleHighlightPanel}
          title="Highlight"
        >
          <span className={styles.highlightIcon}>H</span>
        </button>
      </div>

      {showLinkInput && (
        <div className={styles.linkInput}>
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            data-native-context-menu="true"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="https://..."
            className={styles.linkField}
          />
          <button
            type="button"
            className={styles.linkBtn}
            onMouseDown={handleToolbarMouseDown}
            onClick={applyLink}
            title="Apply link"
          >
            <Icon name="checkSquare" size={14} />
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              className={`${styles.removeLinkButton} ${styles.linkBtnDanger}`}
              onMouseDown={handleToolbarMouseDown}
              onClick={removeLink}
            >
              {t('editor.link.remove')}
            </button>
          )}
        </div>
      )}

      {showColors && (
        <ColorPicker
          value={currentColor}
          onChange={setColor}
          onPresetClick={() => setShowColors(false)}
          presets={TEXT_COLORS}
        />
      )}

      {showHighlight && (
        <ColorPicker
          value={currentHighlight}
          onChange={setHighlight}
          onPresetClick={() => setShowHighlight(false)}
          presets={HIGHLIGHT_COLORS}
          showAlpha
        />
      )}
    </div>
  );

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} updateDelay={0}>
      {menuBody}
    </BubbleMenu>
  );
}
