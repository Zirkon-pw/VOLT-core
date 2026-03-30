import type { ShortcutBinding } from './types';

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift']);
const SPECIAL_KEY_ALIASES: Record<string, string> = {
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  space: 'Space',
  ' ': 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
};

function normalizeKeyToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'doubleshift') {
    return 'DoubleShift';
  }

  const aliased = SPECIAL_KEY_ALIASES[lower];
  if (aliased) {
    return aliased;
  }

  if (/^f\d{1,2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }

  return trimmed.length > 0 ? `${trimmed[0].toUpperCase()}${trimmed.slice(1)}` : null;
}

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

export function isEditableHotkeyTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable;
}

export function normalizeShortcutBinding(input: string | null | undefined): ShortcutBinding | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let needMod = false;
  let needAlt = false;
  let needShift = false;
  let keyToken: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod' || lower === 'meta' || lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'command') {
      needMod = true;
      continue;
    }

    if (lower === 'alt' || lower === 'option') {
      needAlt = true;
      continue;
    }

    if (lower === 'shift') {
      needShift = true;
      continue;
    }

    const normalizedKey = normalizeKeyToken(part);
    if (!normalizedKey || keyToken != null) {
      return null;
    }

    keyToken = normalizedKey;
  }

  if (!keyToken) {
    return null;
  }

  if (keyToken === 'DoubleShift') {
    return 'DoubleShift';
  }

  const normalizedParts = [
    needMod ? 'Mod' : null,
    needAlt ? 'Alt' : null,
    needShift ? 'Shift' : null,
    keyToken,
  ].filter(Boolean);

  return normalizedParts.join('+');
}

export function getEventShortcutBinding(event: KeyboardEvent): ShortcutBinding | null {
  if (isModifierKey(event.key)) {
    return null;
  }

  const keyToken = normalizeKeyToken(event.key);
  if (!keyToken) {
    return null;
  }

  const hasMod = event.metaKey || event.ctrlKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;
  const isPlainCharacter = keyToken.length === 1 && /^[A-Z0-9]$/.test(keyToken);

  if (!hasMod && !hasAlt && !hasShift && isPlainCharacter) {
    return null;
  }

  return normalizeShortcutBinding([
    hasMod ? 'Mod' : null,
    hasAlt ? 'Alt' : null,
    hasShift ? 'Shift' : null,
    keyToken,
  ].filter(Boolean).join('+'));
}

export function matchesShortcutBinding(binding: string, event: KeyboardEvent): boolean {
  const normalizedBinding = normalizeShortcutBinding(binding);
  if (!normalizedBinding || normalizedBinding === 'DoubleShift') {
    return false;
  }

  const parts = normalizedBinding.split('+');
  const keyToken = parts[parts.length - 1];
  const requireMod = parts.includes('Mod');
  const requireAlt = parts.includes('Alt');
  const requireShift = parts.includes('Shift');
  const eventKey = normalizeKeyToken(event.key);

  if (!eventKey || eventKey !== keyToken) {
    return false;
  }

  if (requireMod !== (event.metaKey || event.ctrlKey)) {
    return false;
  }

  if (requireAlt !== event.altKey) {
    return false;
  }

  if (requireShift !== event.shiftKey) {
    return false;
  }

  return true;
}
