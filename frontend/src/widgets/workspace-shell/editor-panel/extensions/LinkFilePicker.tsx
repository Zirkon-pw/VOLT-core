import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { useFileTreeStore } from '@entities/file-tree';
import { translate } from '@shared/i18n';
import {
  collectMarkdownFiles,
  computeRelativePath,
  getEntryDisplayName,
  getParentPath,
  getPathBasename,
} from '@shared/lib/fileTree';
import { getFileIconSource } from '@shared/lib/fileIcons';
import { Icon } from '@shared/ui/icon';
import styles from './LinkFilePicker.module.scss';

interface LinkFilePickerProps {
  editor: Editor;
  voltId: string;
  filePath: string;
  selection: {
    from: number;
    to: number;
  };
  onClose: (restoreSelection?: boolean) => void;
}

export function LinkFilePicker({
  editor,
  voltId,
  filePath,
  selection,
  onClose,
}: LinkFilePickerProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tree = useFileTreeStore((state) => state.trees[voltId] ?? []);
  const allFiles = useMemo(() => collectMarkdownFiles(tree), [tree]);

  const filtered = useMemo(() => {
    if (!search) return allFiles;
    const q = search.toLowerCase();
    return allFiles.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
    );
  }, [allFiles, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const requestClose = useCallback(() => {
    onClose(true);
  }, [onClose]);

  const insertLink = useCallback(
    (targetPath: string) => {
      const currentDir = getParentPath(filePath);
      const relativePath = computeRelativePath(currentDir, targetPath);
      const displayName = getEntryDisplayName(getPathBasename(targetPath), false);

      editor
        .chain()
        .focus()
        .setTextSelection(selection)
        .insertContent({
          type: 'text',
          text: displayName,
          marks: [{ type: 'link', attrs: { href: relativePath } }],
        })
        .run();

      onClose(false);
    },
    [editor, filePath, onClose, selection],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          insertLink(filtered[selectedIndex].path);
        }
      }
    },
    [filtered, insertLink, requestClose, selectedIndex],
  );

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className={styles.overlay} data-testid="link-file-picker" onClick={requestClose}>
      <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrap}>
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder={translate('editor.linkPicker.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div ref={listRef} className={styles.list}>
          {filtered.map((file, i) => (
            <button
              key={file.path}
              type="button"
              data-testid="link-picker-item"
              data-path={file.path}
              className={`${styles.item} ${i === selectedIndex ? styles.itemSelected : ''}`}
              onClick={() => insertLink(file.path)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <Icon name={getFileIconSource(file.path, false)} size={16} />
              <div className={styles.itemText}>
                <span className={styles.itemName}>
                  {getEntryDisplayName(getPathBasename(file.path), false)}
                </span>
                <span className={styles.itemPath}>{file.path}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>{translate('editor.linkPicker.empty')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
