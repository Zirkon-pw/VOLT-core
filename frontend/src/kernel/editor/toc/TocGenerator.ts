import type { Editor } from '@tiptap/react';

export interface TocHeading {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

export function generateToc(editor: Editor): TocHeading[] {
  const headings: TocHeading[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') {
      return;
    }

    const level = Number(node.attrs.level);
    if (level < 1 || level > 3) {
      return;
    }

    const text = node.textContent.trim();
    if (!text) {
      return;
    }

    headings.push({
      level: level as TocHeading['level'],
      text,
      pos,
    });
  });

  return headings;
}

export const TocGenerator = {
  generate: generateToc,
};
