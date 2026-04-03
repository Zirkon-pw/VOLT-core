import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@shared/ui/icon';
import styles from './TableBubbleMenu.module.scss';

const CELL_COLORS = [
  null,
  '#f3f4f6',
  '#dbeafe',
  '#dcfce7',
  '#fef9c3',
  '#fee2e2',
  '#f3e8ff',
  '#ffe4e6',
];

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const { t } = useI18n();
  const [showColors, setShowColors] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const applyColor = (color: string | null) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
    setShowColors(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => ed.isActive('table')}
      updateDelay={0}
    >
      <div className={styles.menu} data-testid="table-bubble-menu">
        <div className={styles.group}>
          <span className={styles.groupLabel}>{t('editor.table.short.addColumnBefore').replace('←', '')}</span>
          <button
            className={styles.btn}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title={t('editor.table.addColumnBefore')}
          >
            <Icon name="plus" size={12} />
            <span>←</span>
          </button>
          <button
            className={styles.btn}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title={t('editor.table.addColumnAfter')}
          >
            <Icon name="plus" size={12} />
            <span>→</span>
          </button>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title={t('editor.table.deleteColumn')}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.group}>
          <span className={styles.groupLabel}>{t('editor.table.short.addRowAbove').replace('↑', '')}</span>
          <button
            className={styles.btn}
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title={t('editor.table.addRowAbove')}
          >
            <Icon name="plus" size={12} />
            <span>↑</span>
          </button>
          <button
            className={styles.btn}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title={t('editor.table.addRowBelow')}
          >
            <Icon name="plus" size={12} />
            <span>↓</span>
          </button>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title={t('editor.table.deleteRow')}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.group} ref={colorRef}>
          <button
            className={`${styles.btn} ${showColors ? styles.btnActive : ''}`}
            onClick={() => setShowColors((v) => !v)}
            title={t('editor.table.cellColor') ?? 'Cell color'}
          >
            <Icon name="paintBucket" size={12} />
          </button>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => editor.chain().focus().deleteTable().run()}
            title={t('editor.table.deleteTable')}
          >
            <Icon name="trash" size={12} />
            <span>{t('editor.table.short.deleteTable')}</span>
          </button>
        </div>

        {showColors && (
          <div className={styles.colorPicker}>
            {CELL_COLORS.map((color) => (
              <button
                key={color ?? 'none'}
                className={styles.colorSwatch}
                style={{ background: color ?? 'var(--color-bg-primary)' }}
                onClick={() => applyColor(color)}
                title={color ?? 'None'}
              >
                {color == null && <Icon name="close" size={10} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
