import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useI18n } from '@app/providers/I18nProvider';
import { ensureExplicitRelativePath } from '@shared/lib/fileTree';
import { ColorPicker } from '@shared/ui/color-picker';
import { Icon } from '@shared/ui/icon';
import styles from './TextBubbleMenu.module.scss';

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fecdd3' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Orange', value: '#fed7aa' },
];

interface TextBubbleMenuProps {
  editor: Editor;
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

export function TextBubbleMenu({ editor }: TextBubbleMenuProps) {
  const { t } = useI18n();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
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

  const closeTransientPanels = useCallback(() => {
    setShowColors(false);
    setShowHighlight(false);
    setShowLinkInput(false);
    setLinkUrl('');
    savedSelectionRef.current = null;
  }, []);

  useEffect(() => {
    if (!showLinkInput && !showColors && !showHighlight) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      closeTransientPanels();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTransientPanels();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeTransientPanels, showColors, showHighlight, showLinkInput]);

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();

  const openLinkInput = () => {
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
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
      savedSelectionRef.current = null;
      setShowLinkInput(false);
      setLinkUrl('');
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
    setShowColors((v) => !v);
    setShowHighlight(false);
    setShowLinkInput(false);
  };

  const toggleHighlightPanel = () => {
    setShowHighlight((v) => !v);
    setShowColors(false);
    setShowLinkInput(false);
  };

  const currentColor = editor.getAttributes('textStyle').color ?? null;
  const currentHighlight = editor.getAttributes('highlight').color ?? null;

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} updateDelay={0}>
      <div ref={menuRef} className={styles.menu} data-testid="text-bubble-menu">
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
    </BubbleMenu>
  );
}
