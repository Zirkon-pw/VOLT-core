import { useFileTreeStore } from '@plugins/file-tree';

export function useFileTreeItemActions() {
  const toggleExpanded = useFileTreeStore((state) => state.toggleExpanded);
  const setSelectedPath = useFileTreeStore((state) => state.setSelectedPath);
  const startCreate = useFileTreeStore((state) => state.startCreate);
  const startRename = useFileTreeStore((state) => state.startRename);
  const requestDelete = useFileTreeStore((state) => state.requestDelete);
  const updateEditingValue = useFileTreeStore((state) => state.updateEditingValue);
  const updatePendingCreateValue = useFileTreeStore((state) => state.updatePendingCreateValue);
  const commitInlineEdit = useFileTreeStore((state) => state.commitInlineEdit);
  const cancelInlineEdit = useFileTreeStore((state) => state.cancelInlineEdit);

  return {
    toggleExpanded,
    setSelectedPath,
    startCreate,
    startRename,
    requestDelete,
    updateEditingValue,
    updatePendingCreateValue,
    commitInlineEdit,
    cancelInlineEdit,
  };
}
