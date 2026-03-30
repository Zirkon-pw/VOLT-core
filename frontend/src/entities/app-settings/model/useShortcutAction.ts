import { useEffect, useRef } from 'react';
import { matchesShortcutBinding, useDoubleShiftGesture, isEditableHotkeyTarget } from '@shared/lib/hotkeys';
import { useResolvedShortcut } from './useResolvedShortcuts';

interface UseShortcutActionOptions {
  enabled?: boolean;
  allowInEditable?: boolean;
  preventDefault?: boolean;
}

export function useShortcutAction(
  actionId: string,
  handler: () => void,
  options: UseShortcutActionOptions = {},
) {
  const { enabled = true, allowInEditable = false, preventDefault = true } = options;
  const resolvedShortcut = useResolvedShortcut(actionId);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const activeBinding = enabled && resolvedShortcut?.status === 'active'
    ? resolvedShortcut.binding
    : null;

  useDoubleShiftGesture(
    activeBinding === 'DoubleShift' ? () => handlerRef.current() : null,
    { enabled: activeBinding === 'DoubleShift', allowInEditable },
  );

  useEffect(() => {
    if (!activeBinding || activeBinding === 'DoubleShift') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!allowInEditable && isEditableHotkeyTarget(event.target)) {
        return;
      }

      if (!matchesShortcutBinding(activeBinding, event)) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      handlerRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeBinding, allowInEditable, preventDefault]);

  return resolvedShortcut;
}
