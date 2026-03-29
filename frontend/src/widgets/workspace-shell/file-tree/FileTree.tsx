import { useEffect } from 'react';
import { BUILTIN_SHORTCUT_ACTIONS, useShortcutAction } from '@entities/app-settings';
import {
  useFileTreeStore,
  selectTree,
  selectLoading,
  selectError,
  selectPendingCreate,
  selectPendingDelete,
  selectDraggingPath,
  selectDropTargetPath,
  selectDropTargetParentPath,
  selectDropPosition,
  selectSelectedPath,
} from '@entities/file-tree';
import { findEntryByPath } from '@shared/lib/fileTree';
import { useI18n } from '@app/providers/I18nProvider';
import { Button } from '@shared/ui/button';
import { Modal } from '@shared/ui/modal';
import { FileTreeInlineEditor } from './FileTreeInlineEditor';
import { FileTreeItem } from './FileTreeItem';
import styles from './FileTree.module.scss';

interface FileTreeProps {
  voltId: string;
  voltPath: string;
}

export function FileTree({ voltId, voltPath }: FileTreeProps) {
  const { t } = useI18n();
  const tree = useFileTreeStore(selectTree(voltId));
  const loading = useFileTreeStore(selectLoading(voltId));
  const error = useFileTreeStore(selectError(voltId));
  const pendingCreate = useFileTreeStore(selectPendingCreate(voltId));
  const pendingDelete = useFileTreeStore(selectPendingDelete(voltId));
  const draggingPath = useFileTreeStore(selectDraggingPath(voltId));
  const dropTargetPath = useFileTreeStore(selectDropTargetPath(voltId));
  const dropTargetParentPath = useFileTreeStore(selectDropTargetParentPath(voltId));
  const dropPosition = useFileTreeStore(selectDropPosition(voltId));
  const selectedPath = useFileTreeStore(selectSelectedPath(voltId));
  const loadTree = useFileTreeStore((state) => state.loadTree);
  const startRename = useFileTreeStore((state) => state.startRename);
  const updatePendingCreateValue = useFileTreeStore((state) => state.updatePendingCreateValue);
  const commitInlineEdit = useFileTreeStore((state) => state.commitInlineEdit);
  const cancelInlineEdit = useFileTreeStore((state) => state.cancelInlineEdit);
  const cancelDelete = useFileTreeStore((state) => state.cancelDelete);
  const confirmDelete = useFileTreeStore((state) => state.confirmDelete);
  const updateDropTarget = useFileTreeStore((state) => state.updateDropTarget);
  const clearDropTarget = useFileTreeStore((state) => state.clearDropTarget);
  const commitMove = useFileTreeStore((state) => state.commitMove);
  const cancelHoverExpand = useFileTreeStore((state) => state.cancelHoverExpand);

  useEffect(() => {
    void loadTree(voltId, voltPath).catch(() => undefined);
  }, [loadTree, voltId, voltPath]);

  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.fileRename, () => {
    if (!selectedPath || pendingCreate) {
      return;
    }

    const entry = findEntryByPath(tree, selectedPath);
    if (!entry) {
      return;
    }

    startRename(voltId, selectedPath);
  });

  const showRootCreate = pendingCreate?.parentPath === '';
  const isDragging = draggingPath != null;
  const isRootDropBefore = isDragging && dropTargetPath == null && dropTargetParentPath === '' && dropPosition === 'before';
  const isRootDropAfter = isDragging && dropTargetPath == null && dropTargetParentPath === '' && dropPosition === 'after';

  return (
    <>
      <div className={styles.tree}>
        {loading && tree.length === 0 && !showRootCreate ? (
          <div className={styles.empty}>{t('common.loading')}</div>
        ) : null}

        {error ? (
          <div className={styles.error}>{error}</div>
        ) : null}

        {!error && tree.length === 0 && !showRootCreate && !loading ? (
          <div className={styles.empty}>{t('fileTree.empty')}</div>
        ) : null}

        {(tree.length > 0 || showRootCreate) && !error ? (
          <div className={styles.list}>
            {isDragging ? (
              <div
                className={`${styles.rootDropZone} ${isRootDropBefore ? styles.rootDropZoneActive : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelHoverExpand(voltId);
                  updateDropTarget(voltId, null, '', 'before');
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void commitMove(voltId, voltPath);
                }}
              />
            ) : null}

            {showRootCreate && pendingCreate ? (
              <FileTreeInlineEditor
                depth={0}
                iconName={pendingCreate.isDir ? 'folder' : 'fileText'}
                value={pendingCreate.value}
                placeholder={pendingCreate.isDir ? t('fileTree.placeholder.folder') : t('fileTree.placeholder.note')}
                onChange={(value) => updatePendingCreateValue(voltId, value)}
                onSubmit={async () => {
                  await commitInlineEdit(voltId, voltPath);
                }}
                onCancel={() => cancelInlineEdit(voltId)}
              />
            ) : null}

            {tree.map((entry) => (
              <FileTreeItem
                key={entry.path}
                voltId={voltId}
                voltPath={voltPath}
                entry={entry}
                depth={0}
              />
            ))}

            {isDragging ? (
              <div
                className={`${styles.rootDropZone} ${styles.rootDropZoneBottom} ${isRootDropAfter ? styles.rootDropZoneActive : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelHoverExpand(voltId);
                  updateDropTarget(voltId, null, '', 'after');
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void commitMove(voltId, voltPath);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => cancelDelete(voltId)}
        title={pendingDelete?.isDir ? t('fileTree.delete.titleFolder') : t('fileTree.delete.titleFile')}
      >
        <p className={styles.deleteMessage}>
          {t('fileTree.delete.message', { name: pendingDelete?.name ?? '' })}
        </p>
        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={() => cancelDelete(voltId)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              void confirmDelete(voltId, voltPath);
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
