import type { IconSource } from '@shared/ui/icon';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: IconSource;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}
