import { useEffect, useRef } from 'react';
import { translate } from '@shared/i18n';
import type { ToastProps } from '../model/types';
import { Icon } from '@shared/ui/icon';
import styles from './ToastView.module.scss';

export function ToastView({ toast, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.closeBtn} onClick={() => onDismiss(toast.id)} aria-label={translate('common.close')}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
