import type { FileEntry } from './types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';

const loadNoteHandler = () => import('../../../../wailsjs/go/wailshandler/NoteHandler');

export async function readNote(voltPath: string, filePath: string): Promise<string> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.ReadNote(voltPath, filePath), 'readNote');
}

export async function saveNote(voltPath: string, filePath: string, content: string): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.SaveNote(voltPath, filePath, content), 'saveNote');
}

export async function listTree(voltPath: string, dirPath: string = ''): Promise<FileEntry[]> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.ListTree(voltPath, dirPath), 'listTree');
}

export async function createNote(voltPath: string, filePath: string): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.CreateNote(voltPath, filePath), 'createNote');
}

export async function createFile(voltPath: string, filePath: string, content = ''): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.CreateFile(voltPath, filePath, content), 'createFile');
}

export async function createDirectory(voltPath: string, dirPath: string): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.CreateDirectory(voltPath, dirPath), 'createDirectory');
}

export async function deleteNote(voltPath: string, filePath: string): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.DeleteNote(voltPath, filePath), 'deleteNote');
}

export async function renameNote(voltPath: string, oldPath: string, newPath: string): Promise<void> {
  return invokeWailsSafe(loadNoteHandler, (mod) => mod.RenameNote(voltPath, oldPath, newPath), 'renameNote');
}
