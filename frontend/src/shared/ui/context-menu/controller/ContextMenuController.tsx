import { ContextMenuProps } from '../model/types';
import { ContextMenuView } from '../view/ContextMenuView';

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  if (items.length === 0) return null;

  return (
    <ContextMenuView
      items={items}
      position={position}
      onClose={onClose}
    />
  );
}
