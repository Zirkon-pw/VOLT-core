import { ReactNode, MouseEvent } from 'react';
import { BUILTIN_SHORTCUT_ACTIONS, useShortcutAction } from '@plugins/settings/SettingsStore';
import { translate } from '@shared/i18n';
import { Icon } from '@shared/ui/icon';
import styles from './ModalView.module.scss';

interface ModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ModalView({ isOpen, onClose, title, children }: ModalViewProps) {
  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.modalClose, onClose, {
    enabled: isOpen,
    allowInEditable: true,
  });

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={translate('common.close')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
