import { getEventShortcutBinding } from './parser';
import type { ShortcutBinding } from './types';

export function captureShortcutBinding(
  event: KeyboardEvent,
  lastShiftTimestamp: number | null,
): { binding: ShortcutBinding | null; nextShiftTimestamp: number | null } {
  if (event.key === 'Shift') {
    const now = Date.now();
    if (lastShiftTimestamp != null && now - lastShiftTimestamp < 300) {
      return { binding: 'DoubleShift', nextShiftTimestamp: null };
    }

    return { binding: null, nextShiftTimestamp: now };
  }

  return {
    binding: getEventShortcutBinding(event),
    nextShiftTimestamp: null,
  };
}
