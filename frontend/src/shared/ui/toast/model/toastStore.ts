import { create } from 'zustand';
import type { ToastItem, ToastType } from '@shared/ui/toast/model/types';

let toastId = 0;

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = String(++toastId);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
