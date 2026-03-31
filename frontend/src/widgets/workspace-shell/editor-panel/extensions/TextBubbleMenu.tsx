import { useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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

export function TextBubbleMenu({ editor }: TextBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const shouldShow = useCallback(({ editor: ed }: { editor: Editor }) => {
    return ed.state.selection.content().size > 0 && !ed.isActive('table');
  }, []);

  const handleToolbarMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

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
    const url = linkUrl.trim();
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
    setShowColors(false);
  };

  const setHighlight = (color: string | null) => {
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setShowHighlight(false);
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
    <BubbleMenu editor={editor} shouldShow={shouldShow}>
      <div className={styles.menu}>
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
                Убрать ссылку
              </button>
            )}
          </div>
        )}

        {showColors && (
          <div className={styles.colorPicker}>
            {TEXT_COLORS.map((c) => (
              <button
                type="button"
                key={c.label}
                className={`${styles.colorSwatch} ${currentColor === c.value ? styles.colorSwatchActive : ''}`}
                style={{ color: c.value ?? 'var(--color-text-primary)' }}
                onMouseDown={handleToolbarMouseDown}
                onClick={() => setColor(c.value)}
                title={c.label}
              >
                A
              </button>
            ))}
          </div>
        )}

        {showHighlight && (
          <div className={styles.colorPicker}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                type="button"
                key={c.label}
                className={`${styles.highlightSwatch} ${currentHighlight === c.value ? styles.highlightSwatchActive : ''}`}
                style={{ background: c.value ?? 'transparent' }}
                onMouseDown={handleToolbarMouseDown}
                onClick={() => setHighlight(c.value)}
                title={c.label}
              >
                {c.value == null && <Icon name="close" size={10} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
