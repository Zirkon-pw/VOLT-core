import { useEffect, useRef } from 'react';
import { isEditableHotkeyTarget } from './parser';

interface UseDoubleShiftGestureOptions {
  enabled?: boolean;
  allowInEditable?: boolean;
}

export function useDoubleShiftGesture(
  onTrigger: (() => void) | null,
  options: UseDoubleShiftGestureOptions = {},
): void {
  const { enabled = true, allowInEditable = false } = options;
  const lastShiftTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !onTrigger) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Shift') {
        return;
      }

      if (!allowInEditable && isEditableHotkeyTarget(event.target)) {
        return;
      }

      const now = Date.now();
      if (now - lastShiftTime.current < 300) {
        lastShiftTime.current = 0;
        onTrigger();
        return;
      }

      lastShiftTime.current = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allowInEditable, enabled, onTrigger]);
}
