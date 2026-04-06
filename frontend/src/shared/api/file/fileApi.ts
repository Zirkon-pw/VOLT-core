import type { FileEntry } from './types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';

const loadFileHandler = () => import('../../../../wailsjs/go/wailshandler/FileHandler');

function ensureMarkdownPath(filePath: string): string {
  const trimmed = filePath.trim();
  return /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

export async function readFile(rootPath: string, path: string): Promise<string> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.Read(rootPath, path), 'readFile');
}

export async function writeFile(rootPath: string, path: string, content: string): Promise<void> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.Write(rootPath, path, content), 'writeFile');
}

export async function listTree(rootPath: string, path: string = ''): Promise<FileEntry[]> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.ListTree(rootPath, path), 'listTree');
}

export async function createFile(rootPath: string, path: string, content = ''): Promise<void> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.CreateFile(rootPath, path, content), 'createFile');
}

export async function createMarkdownFile(rootPath: string, path: string, content = ''): Promise<void> {
  return createFile(rootPath, ensureMarkdownPath(path), content);
}

export async function createDirectory(rootPath: string, path: string): Promise<void> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.CreateDirectory(rootPath, path), 'createDirectory');
}

export async function deletePath(rootPath: string, path: string): Promise<void> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.Delete(rootPath, path), 'deletePath');
}

export async function renamePath(rootPath: string, oldPath: string, newPath: string): Promise<void> {
  return invokeWailsSafe(loadFileHandler, (mod) => mod.Rename(rootPath, oldPath, newPath), 'renamePath');
}
