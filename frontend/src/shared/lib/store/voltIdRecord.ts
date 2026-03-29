/**
 * Helper for updating Record<string, T> fields indexed by voltId.
 * Reduces boilerplate `{ ...state.field, [voltId]: value }` patterns.
 */
export function setForVolt<T>(
  record: Record<string, T>,
  voltId: string,
  value: T,
): Record<string, T> {
  return { ...record, [voltId]: value };
}

export function getForVolt<T>(
  record: Record<string, T> | undefined,
  voltId: string,
  fallback: T,
): T {
  if (!record) return fallback;
  return record[voltId] ?? fallback;
}
