import { dialog } from '../../../../wailsjs/go/models';
import { invokeWailsSafe } from '@shared/api/wailsWithError';
import type { DialogFileFilter } from './types';

const loadDialogHandler = () => import('../../../../wailsjs/go/wailshandler/DialogHandler');

function toWailsFilter(filter: DialogFileFilter): dialog.FileFilter {
  return dialog.FileFilter.createFrom({
    DisplayName: filter.displayName,
    Pattern: filter.pattern,
  });
}

export async function selectDirectory(): Promise<string> {
  return invokeWailsSafe(loadDialogHandler, (mod) => mod.SelectDirectory(), 'dialog.selectDirectory');
}

export async function pickImage(): Promise<string> {
  return invokeWailsSafe(loadDialogHandler, (mod) => mod.PickImage(), 'dialog.pickImage');
}

export async function pickFiles(
  title: string,
  filters: DialogFileFilter[] = [],
  multiple = false,
): Promise<string[]> {
  return invokeWailsSafe(
    loadDialogHandler,
    (mod) => mod.PickFiles(title, filters.map(toWailsFilter), multiple),
    'dialog.pickFiles',
  );
}
