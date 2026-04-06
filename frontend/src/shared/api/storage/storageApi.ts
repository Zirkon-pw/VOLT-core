import { invokeWailsSafe } from '@shared/api/wailsWithError';
import type { StorageEntry } from './types';

const loadStorageHandler = () => import('../../../../wailsjs/go/wailshandler/StorageHandler');

function decodeRawValue(raw: unknown): string {
  if (raw == null) {
    return '';
  }

  if (typeof raw === 'string') {
    return raw;
  }

  if (raw instanceof Uint8Array) {
    return new TextDecoder().decode(raw);
  }

  if (Array.isArray(raw) && raw.every((item) => typeof item === 'number')) {
    return new TextDecoder().decode(Uint8Array.from(raw));
  }

  return JSON.stringify(raw);
}

function parseStoredValue<T>(raw: unknown): T {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Uint8Array)) {
    return raw as T;
  }

  const decoded = decodeRawValue(raw);
  if (!decoded) {
    return undefined as T;
  }

  return JSON.parse(decoded) as T;
}

function isMissingKeyError(error: unknown): boolean {
  return error instanceof Error && /key not found/i.test(error.message);
}

export async function getStorageValue<T>(namespace: string, key: string): Promise<T | null> {
  try {
    const raw = await invokeWailsSafe(
      loadStorageHandler,
      (mod) => mod.Get(namespace, key),
      `storage.get:${namespace}:${key}`,
    );
    return parseStoredValue<T>(raw);
  } catch (error) {
    if (isMissingKeyError(error)) {
      return null;
    }
    throw error;
  }
}

export async function setStorageValue(namespace: string, key: string, value: unknown): Promise<void> {
  return invokeWailsSafe(
    loadStorageHandler,
    (mod) => mod.Set(namespace, key, value as never),
    `storage.set:${namespace}:${key}`,
  );
}

export async function deleteStorageValue(namespace: string, key: string): Promise<void> {
  return invokeWailsSafe(
    loadStorageHandler,
    (mod) => mod.Delete(namespace, key),
    `storage.delete:${namespace}:${key}`,
  );
}

export async function listStorageValues<T>(namespace: string): Promise<StorageEntry<T>[]> {
  const entries = await invokeWailsSafe(
    loadStorageHandler,
    (mod) => mod.List(namespace),
    `storage.list:${namespace}`,
  );

  return (entries as Array<{ key: string; value: unknown }>).map((entry) => ({
    key: entry.key,
    value: parseStoredValue<T>(entry.value),
  }));
}
