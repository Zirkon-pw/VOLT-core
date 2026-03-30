import { useToastStore } from '../model/toastStore';

export function notifyError(message: string, duration = 5000): void {
  useToastStore.getState().addToast(message, 'error', duration);
}

export function notifySuccess(message: string, duration = 4000): void {
  useToastStore.getState().addToast(message, 'success', duration);
}

export function notifyInfo(message: string, duration = 4000): void {
  useToastStore.getState().addToast(message, 'info', duration);
}
