import type { IconSource } from '@shared/ui/icon';
import { getFileExtension, isMarkdownPath } from './fileTypes';

type AccentToken =
  | '--color-icon-coral'
  | '--color-icon-sage'
  | '--color-icon-sky'
  | '--color-icon-butter'
  | '--color-icon-plum'
  | '--color-icon-olive'
  | '--color-icon-slate';

type FileIconKind =
  | 'folder'
  | 'folder-open'
  | 'markdown'
  | 'text'
  | 'image'
  | 'pdf'
  | 'json'
  | 'yaml'
  | 'web'
  | 'code'
  | 'data'
  | 'archive'
  | 'media'
  | 'file';

const EXTENSION_TO_KIND: Record<string, FileIconKind> = {
  '.md': 'markdown',
  '.txt': 'text',
  '.rtf': 'text',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.svg': 'image',
  '.bmp': 'image',
  '.ico': 'image',
  '.pdf': 'pdf',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'yaml',
  '.ini': 'yaml',
  '.env': 'yaml',
  '.ts': 'web',
  '.tsx': 'web',
  '.js': 'web',
  '.jsx': 'web',
  '.mjs': 'web',
  '.cjs': 'web',
  '.html': 'web',
  '.htm': 'web',
  '.xml': 'web',
  '.css': 'web',
  '.scss': 'web',
  '.sass': 'web',
  '.less': 'web',
  '.py': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.java': 'code',
  '.c': 'code',
  '.cpp': 'code',
  '.cc': 'code',
  '.h': 'code',
  '.hpp': 'code',
  '.cs': 'code',
  '.php': 'code',
  '.rb': 'code',
  '.sh': 'code',
  '.zsh': 'code',
  '.bash': 'code',
  '.csv': 'data',
  '.tsv': 'data',
  '.sql': 'data',
  '.sqlite': 'data',
  '.db': 'data',
  '.zip': 'archive',
  '.tar': 'archive',
  '.gz': 'archive',
  '.tgz': 'archive',
  '.rar': 'archive',
  '.7z': 'archive',
  '.mp3': 'media',
  '.wav': 'media',
  '.flac': 'media',
  '.mp4': 'media',
  '.mov': 'media',
  '.mkv': 'media',
};

function singleToneIcon(color: AccentToken, innerSvg: string): IconSource {
  return {
    svg: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g stroke="var(${color})" fill="none" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round">
          ${innerSvg}
        </g>
      </svg>
    `,
  };
}

function folderIcon(open = false): IconSource {
  if (open) {
    return singleToneIcon(
      '--color-icon-butter',
      '<path d="M3.6 9.8h6.45l1.75-2.25h8.45a1.8 1.8 0 0 1 1.73 2.29l-1.7 5.73A2.1 2.1 0 0 1 18.26 17H5.72A2.12 2.12 0 0 1 3.6 14.88V9.8Z"/>',
    );
  }

  return singleToneIcon(
    '--color-icon-sage',
    '<path d="M3.8 7.55A2.15 2.15 0 0 1 5.95 5.4h4.02l1.56 1.76h6.52A2.15 2.15 0 0 1 20.2 9.3v7.15a2.15 2.15 0 0 1-2.15 2.15H5.95A2.15 2.15 0 0 1 3.8 16.45V7.55Z"/>',
  );
}

function documentIcon(color: AccentToken, detail: string): IconSource {
  return singleToneIcon(
    color,
    `
      <path d="M7.25 3.8h6.55l4.15 4.18v11a1.95 1.95 0 0 1-1.95 1.95H7.25a1.95 1.95 0 0 1-1.95-1.95V5.75A1.95 1.95 0 0 1 7.25 3.8Z"/>
      <path d="M13.8 3.95v3.6a.9.9 0 0 0 .9.9h3.1"/>
      ${detail}
    `,
  );
}

function iconForKind(kind: Exclude<FileIconKind, 'folder' | 'folder-open'>): IconSource {
  switch (kind) {
    case 'markdown':
      return documentIcon('--color-icon-coral', '<path d="M9 15.6V10l2.15 2.35L13.3 10v5.6M15.45 10h1.85M16.38 10v5.6"/>');
    case 'text':
      return documentIcon('--color-icon-slate', '<path d="M9.05 10.2h5.9M9.05 13h5.9M9.05 15.8h4.4"/>');
    case 'image':
      return documentIcon('--color-icon-sky', '<circle cx="10.2" cy="10.25" r="1.1"/><path d="M8.9 15.85 11.55 13l1.95 1.92 1.7-1.75 1.25 2.68"/>');
    case 'pdf':
      return documentIcon('--color-icon-coral', '<path d="M8.85 15.6v-5.25h2c1.05 0 1.7.55 1.7 1.45 0 .98-.7 1.5-1.76 1.5H8.85Zm0-2.3h1.78M13.95 15.6v-5.25h1.5a2.17 2.17 0 0 1 2.3 2.63 2.22 2.22 0 0 1-2.3 2.62h-1.5Z"/>');
    case 'json':
      return documentIcon('--color-icon-butter', '<path d="M10.35 10.1c-.8.24-1.25.82-1.25 1.7v.35c0 .54-.24.88-.76 1.02.52.14.76.48.76 1.02v.34c0 .9.45 1.47 1.25 1.72M14.95 10.1c.8.24 1.25.82 1.25 1.7v.35c0 .54.24.88.76 1.02-.52.14-.76.48-.76 1.02v.34c0 .9-.45 1.47-1.25 1.72"/>');
    case 'yaml':
      return documentIcon('--color-icon-sage', '<circle cx="9.2" cy="10.5" r=".55"/><circle cx="9.2" cy="13.1" r=".55"/><circle cx="9.2" cy="15.7" r=".55"/><path d="M11.1 10.5h4.1M11.1 13.1h4.1M11.1 15.7h3.1"/>');
    case 'web':
      return documentIcon('--color-icon-sky', '<path d="M10.55 10.55 8.35 13l2.2 2.45M14.95 10.55 17.15 13l-2.2 2.45M13.1 9.95 11.95 16"/>');
    case 'code':
      return documentIcon('--color-icon-plum', '<path d="M10.7 11.15 8.9 13l1.8 1.85M14.3 11.15 16.1 13l-1.8 1.85"/>');
    case 'data':
      return documentIcon('--color-icon-olive', '<path d="M8.85 10.45h6.35M8.85 13h6.35M8.85 15.55h6.35M11.95 10.45v5.1"/>');
    case 'archive':
      return documentIcon('--color-icon-butter', '<path d="M12.2 9.95v6.2M12.2 9.95h1.7M12.2 12.15h1.5M12.2 14.35h1.5"/>');
    case 'media':
      return documentIcon('--color-icon-coral', '<path d="M10.4 10.3v5.4l4.35-2.7-4.35-2.7Z"/>');
    case 'file':
    default:
      return documentIcon('--color-icon-slate', '<path d="M9.1 10.45h5.8M9.1 13.1h5.8M9.1 15.75h3.95"/>');
  }
}

export function getFileIconKind(path: string, isDir: boolean, expanded = false): FileIconKind {
  if (isDir) {
    return expanded ? 'folder-open' : 'folder';
  }

  if (isMarkdownPath(path)) {
    return 'markdown';
  }

  const extension = getFileExtension(path);
  return extension ? (EXTENSION_TO_KIND[extension] ?? 'file') : 'file';
}

export function getFileIconSource(path: string, isDir: boolean, expanded = false): IconSource {
  const kind = getFileIconKind(path, isDir, expanded);

  if (kind === 'folder') return folderIcon(false);
  if (kind === 'folder-open') return folderIcon(true);
  return iconForKind(kind);
}
