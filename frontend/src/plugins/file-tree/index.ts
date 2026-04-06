export { fileTreeManifest, fileTreePlugin } from './FileTreePlugin';
export { Sidebar } from './Sidebar';
export { FileTree as FileTreeView } from './ui/file-tree/FileTree';
export { FileTreeItem } from './ui/file-tree/FileTreeItem';
export { FileTreeInlineEditor as InlineRename } from './ui/file-tree/FileTreeInlineEditor';
export { useFileTreeDragDrop as useDragDropHandler } from './hooks/useFileTreeDragDrop';
export {
  useFileTreeStore,
  selectTree,
  selectLoading,
  selectError,
  selectExpandedPaths,
  selectSelectedPath,
  selectPendingCreate,
  selectPendingDelete,
  selectDraggingPath,
  selectDropTargetPath,
  selectDropTargetParentPath,
  selectDropPosition,
  syncTabsOnFileCreate,
  syncTabsOnRename,
  syncTabsOnDelete,
} from './model';
export {
  createDirectory,
  createFile,
  deletePath,
  listTree,
  renamePath,
} from '@shared/api/file';
