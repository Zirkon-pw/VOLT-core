import { createDirectory } from '@shared/api/file';
import { selectDirectory as selectDirectoryDialog } from '@shared/api/dialog';
import {
  deleteStorageValue,
  listStorageValues,
  setStorageValue,
} from '@shared/api/storage';
import type { Volt } from './model/types';

const VOLT_NAMESPACE = 'vaults';

function normalizePath(value: string): string {
  return value.trim().replace(/[\\/]+$/, '');
}

function joinPath(parentPath: string, childName: string): string {
  const normalizedParent = normalizePath(parentPath);
  if (!normalizedParent) {
    return childName.trim();
  }

  const separator = normalizedParent.includes('\\') && !normalizedParent.includes('/') ? '\\' : '/';
  return `${normalizedParent}${separator}${childName.trim()}`;
}

async function readAllVolts(): Promise<Volt[]> {
  const entries = await listStorageValues<Volt>(VOLT_NAMESPACE);
  return entries
    .map((entry) => entry.value)
    .filter((entry): entry is Volt => (
      entry != null &&
      typeof entry.id === 'string' &&
      typeof entry.name === 'string' &&
      typeof entry.path === 'string' &&
      typeof entry.createdAt === 'string'
    ))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export type { Volt };

export async function listVolts(): Promise<Volt[]> {
  return readAllVolts();
}

export async function createVolt(name: string, path: string): Promise<Volt> {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    throw new Error('Workspace path is required');
  }

  const existing = await readAllVolts();
  if (existing.some((entry) => normalizePath(entry.path) === normalizedPath)) {
    throw new Error('A workspace with this path already exists');
  }

  const volt: Volt = {
    id: globalThis.crypto?.randomUUID?.() ?? `vault-${Date.now()}`,
    name: name.trim() || normalizedPath.split(/[\\/]/).filter(Boolean).at(-1) || normalizedPath,
    path: normalizedPath,
    createdAt: new Date().toISOString(),
  };

  await setStorageValue(VOLT_NAMESPACE, volt.id, volt);
  return volt;
}

export async function createVoltInParent(name: string, parentPath: string, directoryName: string): Promise<Volt> {
  const normalizedDirectoryName = directoryName.trim();
  if (!normalizedDirectoryName) {
    throw new Error('Workspace directory name is required');
  }

  await createDirectory(parentPath, normalizedDirectoryName);
  return createVolt(name, joinPath(parentPath, normalizedDirectoryName));
}

export async function deleteVolt(id: string): Promise<void> {
  return deleteStorageValue(VOLT_NAMESPACE, id);
}

export async function selectDirectory(): Promise<string> {
  return selectDirectoryDialog();
}
