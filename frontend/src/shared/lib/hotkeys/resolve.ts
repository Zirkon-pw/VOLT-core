import { normalizeShortcutBinding } from './parser';
import type { ResolvedShortcut, ShortcutDescriptor, ShortcutBinding } from './types';

export function resolveShortcutDescriptors(
  descriptors: ShortcutDescriptor[],
  overrides: Record<string, ShortcutBinding>,
): ResolvedShortcut[] {
  const claimedBindings = new Map<ShortcutBinding, string>();

  return descriptors.map((descriptor) => {
    const overrideBinding = normalizeShortcutBinding(overrides[descriptor.actionId]);
    const defaultBinding = normalizeShortcutBinding(descriptor.defaultBinding);
    const binding = overrideBinding ?? defaultBinding;
    const source = overrideBinding ? 'override' : descriptor.source;

    if (!binding) {
      return {
        actionId: descriptor.actionId,
        descriptor,
        binding: null,
        source,
        status: 'unbound',
        conflictWith: null,
      } satisfies ResolvedShortcut;
    }

    const conflictWith = claimedBindings.get(binding) ?? null;
    if (conflictWith) {
      return {
        actionId: descriptor.actionId,
        descriptor,
        binding,
        source,
        status: 'conflicted',
        conflictWith,
      } satisfies ResolvedShortcut;
    }

    claimedBindings.set(binding, descriptor.actionId);
    return {
      actionId: descriptor.actionId,
      descriptor,
      binding,
      source,
      status: 'active',
      conflictWith: null,
    } satisfies ResolvedShortcut;
  });
}

export function findShortcutConflict(
  descriptors: ShortcutDescriptor[],
  overrides: Record<string, ShortcutBinding>,
  targetActionId: string,
  candidateBinding: ShortcutBinding | null,
): ResolvedShortcut | null {
  const normalizedCandidate = normalizeShortcutBinding(candidateBinding);
  if (!normalizedCandidate) {
    return null;
  }

  const nextOverrides = { ...overrides };
  delete nextOverrides[targetActionId];
  const resolved = resolveShortcutDescriptors(descriptors, nextOverrides);

  return resolved.find((item) => item.binding === normalizedCandidate && item.status === 'active') ?? null;
}
