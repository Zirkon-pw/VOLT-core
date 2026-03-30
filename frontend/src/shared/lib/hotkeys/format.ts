import { normalizeShortcutBinding } from './parser';
import type { ShortcutBinding } from './types';

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const platform = navigator.platform || navigator.userAgent;
  return /mac/i.test(platform);
}

export function formatShortcutBinding(binding: ShortcutBinding | null | undefined): string {
  const normalized = normalizeShortcutBinding(binding);
  if (!normalized) {
    return '';
  }

  if (normalized === 'DoubleShift') {
    return 'Double Shift';
  }

  const parts = normalized.split('+');
  const isMac = isMacPlatform();

  return parts.map((part) => {
    if (!isMac) {
      if (part === 'Mod') return 'Ctrl';
      return part;
    }

    if (part === 'Mod') return '⌘';
    if (part === 'Alt') return '⌥';
    if (part === 'Shift') return '⇧';
    if (part === 'Escape') return 'Esc';
    return part;
  }).join(isMac ? '' : '+');
}
