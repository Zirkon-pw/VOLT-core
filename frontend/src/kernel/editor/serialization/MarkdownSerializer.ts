import type { Editor } from '@tiptap/react';

function readMarkdownStorage(editor: Editor): { getMarkdown?: () => string } | null {
  return ((editor.storage as unknown as Record<string, unknown>).markdown ?? null) as { getMarkdown?: () => string } | null;
}

export function serializeMarkdown(editor: Editor | null): string {
  if (!editor) {
    return '';
  }

  const markdownStorage = readMarkdownStorage(editor);
  if (typeof markdownStorage?.getMarkdown === 'function') {
    return markdownStorage.getMarkdown();
  }

  return editor.getText();
}

export const MarkdownSerializer = {
  serialize: serializeMarkdown,
};
