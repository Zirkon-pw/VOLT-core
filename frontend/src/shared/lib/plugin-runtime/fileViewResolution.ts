import type { RegisteredFileViewer } from '@entities/plugin';
import { getFileExtension, isImagePath, isMarkdownPath } from '@shared/lib/fileTypes';

export interface BuiltInFileViewTarget {
  type: 'builtin';
  kind: 'markdown' | 'image' | 'raw-text';
}

export interface PluginCustomFileViewTarget {
  type: 'plugin-custom';
  viewer: RegisteredFileViewer & { type: 'custom' };
}

export interface PluginHostEditorFileViewTarget {
  type: 'plugin-host-editor';
  viewer: RegisteredFileViewer & { type: 'host-editor' };
}

export type FileViewTarget =
  | BuiltInFileViewTarget
  | PluginCustomFileViewTarget
  | PluginHostEditorFileViewTarget;

function sortViewers(viewers: RegisteredFileViewer[]): RegisteredFileViewer[] {
  return [...viewers].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    const leftKey = `${left.pluginId}:${left.id}`;
    const rightKey = `${right.pluginId}:${right.id}`;
    return leftKey.localeCompare(rightKey);
  });
}

export function resolveFileViewTarget(
  filePath: string,
  viewers: RegisteredFileViewer[],
): FileViewTarget {
  if (isMarkdownPath(filePath)) {
    return { type: 'builtin', kind: 'markdown' };
  }

  if (isImagePath(filePath)) {
    return { type: 'builtin', kind: 'image' };
  }

  const extension = getFileExtension(filePath);
  if (extension) {
    const matched = sortViewers(viewers.filter((viewer) => viewer.extensions.includes(extension)));
    const winner = matched[0];
    if (winner) {
      return winner.type === 'host-editor'
        ? { type: 'plugin-host-editor', viewer: winner }
        : { type: 'plugin-custom', viewer: winner };
    }
  }

  return { type: 'builtin', kind: 'raw-text' };
}
