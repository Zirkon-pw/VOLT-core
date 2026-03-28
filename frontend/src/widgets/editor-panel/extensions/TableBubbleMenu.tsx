import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@uikit/icon';
import styles from './TableBubbleMenu.module.scss';

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const { t } = useI18n();

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => ed.isActive('table')}
    >
      <div className={styles.menu}>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title={t('editor.table.addColumnBefore')}
        >
          <Icon name="plus" size={14} />
          <span>{t('editor.table.short.addColumnBefore')}</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title={t('editor.table.addColumnAfter')}
        >
          <Icon name="plus" size={14} />
          <span>{t('editor.table.short.addColumnAfter')}</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title={t('editor.table.deleteColumn')}
        >
          <Icon name="trash" size={14} />
          <span>{t('editor.table.short.deleteColumn')}</span>
        </button>
        <div className={styles.divider} />
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title={t('editor.table.addRowAbove')}
        >
          <Icon name="plus" size={14} />
          <span>{t('editor.table.short.addRowAbove')}</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title={t('editor.table.addRowBelow')}
        >
          <Icon name="plus" size={14} />
          <span>{t('editor.table.short.addRowBelow')}</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().deleteRow().run()}
          title={t('editor.table.deleteRow')}
        >
          <Icon name="trash" size={14} />
          <span>{t('editor.table.short.deleteRow')}</span>
        </button>
        <div className={styles.divider} />
        <button
          className={styles.btnDanger}
          onClick={() => editor.chain().focus().deleteTable().run()}
          title={t('editor.table.deleteTable')}
        >
          <Icon name="trash" size={14} />
          <span>{t('editor.table.short.deleteTable')}</span>
        </button>
      </div>
    </BubbleMenu>
  );
}
