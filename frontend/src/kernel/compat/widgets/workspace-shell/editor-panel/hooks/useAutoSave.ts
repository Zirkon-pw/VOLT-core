import { useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useTabStore } from '@entities/tab';
import { writeFile } from '@shared/api/file';
import { EDITOR } from '@shared/config/constants';
import { emit } from '@shared/lib/plugin-runtime';

interface UseAutoSaveOptions {
  editor: Editor | null;
  voltId: string;
  voltPath: string;
  filePath: string | null;
  delay?: number;
  /** Optional transform applied to markdown before saving (e.g. unresolve image URLs) */
  transformMarkdown?: (md: string) => string;
}

export function useAutoSave({
  editor,
  voltId,
  voltPath,
  filePath,
  delay = EDITOR.AUTO_SAVE_DELAY_MS,
  transformMarkdown,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingSuppressionsRef = useRef(0);
  const persistedMarkdownRef = useRef<string | null>(null);
  const setDirty = useTabStore((s) => s.setDirty);

  const getSerializedMarkdown = useCallback(() => {
    if (!editor) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdownStorage = (editor.storage as any).markdown;
    const getMarkdown = markdownStorage?.getMarkdown;
    if (typeof getMarkdown !== 'function') {
      return null;
    }

    const nextMarkdown = getMarkdown.call(markdownStorage) as string;
    return transformMarkdown ? transformMarkdown(nextMarkdown) : nextMarkdown;
  }, [editor, transformMarkdown]);

  const markPersisted = useCallback((markdown: string | null) => {
    persistedMarkdownRef.current = markdown;

    if (filePath) {
      setDirty(voltId, filePath, false);
    }
  }, [filePath, setDirty, voltId]);

  const withTrackingSuppressed = useCallback((mutate: () => void) => {
    trackingSuppressionsRef.current += 1;

    try {
      mutate();
    } finally {
      requestAnimationFrame(() => {
        trackingSuppressionsRef.current = Math.max(0, trackingSuppressionsRef.current - 1);
      });
    }
  }, []);

  const save = useCallback(async () => {
    if (!editor || !filePath) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const markdown = getSerializedMarkdown();
      if (markdown == null) {
        return;
      }

      if (markdown === persistedMarkdownRef.current) {
        setDirty(voltId, filePath, false);
        return;
      }

      await writeFile(voltPath, filePath, markdown);
      markPersisted(markdown);
      emit('file-save', filePath);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [editor, filePath, getSerializedMarkdown, markPersisted, setDirty, voltId, voltPath]);

  useEffect(() => {
    if (!editor || !filePath) return;

    const handleUpdate = () => {
      if (trackingSuppressionsRef.current > 0) {
        return;
      }

      setDirty(voltId, filePath, true);
      emit('editor-change', undefined);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void save();
      }, delay);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void save();
      }
    };
  }, [editor, filePath, voltId, delay, save, setDirty]);

  useEffect(() => {
    persistedMarkdownRef.current = null;
  }, [filePath]);

  return {
    save,
    markPersisted,
    withTrackingSuppressed,
  };
}
