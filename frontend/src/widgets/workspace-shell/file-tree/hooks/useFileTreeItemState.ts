import { useMemo } from 'react';
import { useFileTreeStore } from '@entities/file-tree';
import { usePluginRegistryStore } from '@entities/plugin';
import { useTabStore } from '@entities/tab';

const EMPTY_PATHS = [] as const;

export function useFileTreeItemState(voltId: string, entryPath: string, entryIsDir: boolean) {
  const expandedPaths = useFileTreeStore((state) => state.expandedPaths[voltId] ?? EMPTY_PATHS);
  const selectedPath = useFileTreeStore((state) => state.selectedPath[voltId] ?? null);
  const pendingCreate = useFileTreeStore((state) => state.pendingCreate[voltId] ?? null);
  const editingItem = useFileTreeStore((state) => state.editingItem[voltId] ?? null);
  const draggingPath = useFileTreeStore((state) => state.draggingPath[voltId] ?? null);
  const draggingIsDir = useFileTreeStore((state) => state.draggingIsDir[voltId] ?? null);
  const dropTargetPath = useFileTreeStore((state) => state.dropTargetPath[voltId] ?? null);
  const dropPosition = useFileTreeStore((state) => state.dropPosition[voltId] ?? null);
  const pluginContextMenuItems = usePluginRegistryStore((state) => state.contextMenuItems);
  const openTab = useTabStore((state) => state.openTab);

  return useMemo(() => {
    const expanded = expandedPaths.includes(entryPath);
    const isSelected = selectedPath === entryPath;
    const isEditing = editingItem?.path === entryPath;
    const isPendingCreateParent = pendingCreate?.parentPath === entryPath;
    const isDraggingItem = draggingPath === entryPath;
    const isDropInside = dropTargetPath === entryPath && dropPosition === 'inside';
    const isDropBefore = dropTargetPath === entryPath && dropPosition === 'before';
    const isDropAfter = dropTargetPath === entryPath && dropPosition === 'after';
    const isDragDisabled = Boolean(editingItem || pendingCreate);
    const pluginMenuItems = pluginContextMenuItems.filter((item) => (
      item.filter ? item.filter({ path: entryPath, isDir: entryIsDir }) : true
    ));

    return {
      expanded,
      isSelected,
      isEditing,
      editingItem,
      isPendingCreateParent,
      pendingCreate,
      isDraggingItem,
      isDropInside,
      isDropBefore,
      isDropAfter,
      isDragDisabled,
      draggingPath,
      draggingIsDir,
      dropTargetPath,
      pluginMenuItems,
      openTab,
    };
  }, [
    expandedPaths, selectedPath, pendingCreate, editingItem,
    draggingPath, draggingIsDir, dropTargetPath, dropPosition,
    pluginContextMenuItems, openTab, entryPath, entryIsDir,
  ]);
}
