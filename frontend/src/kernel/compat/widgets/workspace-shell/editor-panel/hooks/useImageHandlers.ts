import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { copyImage, pickImage, saveImageBase64, base64ToBlobUrl } from '@plugins/image-service';
import { isImagePath } from '@shared/lib/fileTypes';
import {
  computeRelativePath,
  getParentPath,
  getPathBasename,
  getEntryDisplayName,
} from '@shared/lib/fileTree';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

interface UseImageHandlersOptions {
  editor: Editor | null;
  voltId: string;
  voltPath: string;
  filePath: string | null;
  imageDir: string;
  resolve: (relPath: string) => Promise<string>;
  register: (relPath: string, blobUrl: string) => void;
  notifyFsMutation: (voltId: string, voltPath: string) => Promise<void>;
}

function readFileAsBase64(file: Blob): Promise<{ b64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(',')[1];
      if (!b64) {
        reject(new Error('Empty base64 data'));
        return;
      }
      resolve({ b64, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useImageHandlers({
  editor,
  voltId,
  voltPath,
  filePath,
  imageDir,
  resolve,
  register,
  notifyFsMutation,
}: UseImageHandlersOptions) {
  const insertImage = useCallback(async (relPath: string, existingBlobUrl?: string) => {
    if (!editor) return;
    let src: string;
    if (existingBlobUrl) {
      register(relPath, existingBlobUrl);
      src = existingBlobUrl;
    } else {
      src = await resolve(relPath);
    }
    editor.chain().focus().setImage({ src }).run();
  }, [editor, resolve, register]);

  const saveAndInsert = useCallback(async (file: Blob, fileName: string) => {
    try {
      const { b64 } = await readFileAsBase64(file);
      const relPath = await saveImageBase64(voltPath, fileName, imageDir, b64);
      const blobUrl = base64ToBlobUrl(b64, file.type);
      await insertImage(relPath, blobUrl);
      void notifyFsMutation(voltId, voltPath);
    } catch (err) {
      console.error('Failed to save image:', err);
    }
  }, [voltPath, imageDir, insertImage, notifyFsMutation, voltId]);

  const handleInternalFileDrop = useCallback((e: React.DragEvent) => {
    if (!editor || !filePath) return false;
    const raw = e.dataTransfer?.getData('application/x-volt-file');
    if (!raw) return false;

    try {
      const data = JSON.parse(raw) as { path: string; isDir: boolean; name: string };
      e.preventDefault();
      e.stopPropagation();

      const currentDir = getParentPath(filePath);
      const relativePath = computeRelativePath(currentDir, data.path);
      const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      const pos = coords?.pos ?? editor.state.selection.from;

      if (isImagePath(data.path)) {
        void (async () => {
          const src = await resolve(data.path);
          editor.chain().focus().setTextSelection(pos).setImage({ src }).run();
        })();
      } else {
        const displayName = getEntryDisplayName(getPathBasename(data.path), data.isDir);
        editor
          .chain()
          .focus()
          .setTextSelection(pos)
          .insertContent({
            type: 'text',
            text: displayName,
            marks: [{ type: 'link', attrs: { href: relativePath } }],
          })
          .run();
      }
      return true;
    } catch {
      return false;
    }
  }, [editor, filePath, resolve]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (handleInternalFileDrop(e)) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (IMAGE_TYPES.includes(file.type)) {
        e.preventDefault();
        e.stopPropagation();
        void saveAndInsert(file, file.name);
        return;
      }
    }
  }, [handleInternalFileDrop, saveAndInsert]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer?.types?.includes('Files') ||
      e.dataTransfer?.types?.includes('application/x-volt-file')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const ext = blob.type.split('/')[1] || 'png';
        const fileName = `pasted_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
        void saveAndInsert(blob, fileName);
        return;
      }
    }

  }, [saveAndInsert]);

  // Listen for slash command image picker event
  useEffect(() => {
    if (!editor) return;

    const handler = async () => {
      try {
        const selectedPath = await pickImage();
        if (selectedPath) {
          const relPath = await copyImage(voltPath, selectedPath, imageDir);
          await insertImage(relPath);
          void notifyFsMutation(voltId, voltPath);
        }
      } catch (e) {
        console.error('Failed to pick image:', e);
      }
    };

    window.addEventListener('volt:pick-image', handler);
    return () => window.removeEventListener('volt:pick-image', handler);
  }, [editor, imageDir, insertImage, notifyFsMutation, voltId, voltPath]);

  return { handleDrop, handleDragOver, handlePaste };
}
