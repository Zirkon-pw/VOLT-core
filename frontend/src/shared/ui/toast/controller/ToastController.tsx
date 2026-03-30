import { useToastStore } from '../model/toastStore';
import { ToastContainerView } from '../view/ToastContainerView';

export function ToastController() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return <ToastContainerView toasts={toasts} onDismiss={removeToast} />;
}
