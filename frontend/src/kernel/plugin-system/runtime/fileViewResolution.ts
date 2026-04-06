import type { RegisteredFileViewer } from '@kernel/plugin-system/model/pluginRegistry';
import { isImagePath, isMarkdownPath } from '@shared/lib/fileTypes';

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

function getViewerMatchLength(filePath: string, viewer: RegisteredFileViewer): number {
  const normalizedPath = filePath.toLowerCase();
  let longestMatch = 0;

  viewer.extensions.forEach((extension) => {
    const normalizedExtension = extension.trim().toLowerCase();
    if (!normalizedExtension) {
      return;
    }

    if (normalizedPath.endsWith(normalizedExtension)) {
      longestMatch = Math.max(longestMatch, normalizedExtension.length);
    }
  });

  return longestMatch;
}

function sortViewers(filePath: string, viewers: RegisteredFileViewer[]): RegisteredFileViewer[] {
  return [...viewers].sort((left, right) => {
    const rightMatchLength = getViewerMatchLength(filePath, right);
    const leftMatchLength = getViewerMatchLength(filePath, left);
    if (rightMatchLength !== leftMatchLength) {
      return rightMatchLength - leftMatchLength;
    }

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

  const matched = sortViewers(filePath, viewers.filter((viewer) => getViewerMatchLength(filePath, viewer) > 0));
  const winner = matched[0];
  if (winner) {
    return winner.type === 'host-editor'
      ? { type: 'plugin-host-editor', viewer: winner }
      : { type: 'plugin-custom', viewer: winner };
  }

  return { type: 'builtin', kind: 'raw-text' };
}
