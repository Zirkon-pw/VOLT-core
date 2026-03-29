import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { copyImage, pickImage, saveImageBase64, base64ToBlobUrl } from '@shared/api/image/imageApi';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

interface UseImageHandlersOptions {
  editor: Editor | null;
  voltId: string;
  voltPath: string;
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

  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, [saveAndInsert]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
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
