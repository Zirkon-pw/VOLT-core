import type { ToastContainerProps } from '../model/types';
import { ToastView } from './ToastView';
import styles from './ToastContainerView.module.scss';

export function ToastContainerView({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
