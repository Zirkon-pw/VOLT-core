import { useEffect, useRef } from 'react';
import { Icon } from '@shared/ui/icon';
import type { ContextMenuItem } from '../model/types';
import styles from './ContextMenuView.module.scss';

interface ContextMenuViewProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenuView({ items, position, onClose }: ContextMenuViewProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 4}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 4}px`;
    }
  }, [position]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: position.x, top: position.y }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className={styles.separator} />;
          }
          return (
            <button
              key={index}
              type="button"
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {item.icon && (
                <span className={styles.icon}>
                  <Icon name={item.icon} size={14} />
                </span>
              )}
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
