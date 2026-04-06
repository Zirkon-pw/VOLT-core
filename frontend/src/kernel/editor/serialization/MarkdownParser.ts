import { preprocessMarkdown } from '@widgets/workspace-shell/editor-panel/lib/markdownPreprocessor';

export function parseMarkdown(markdown: string): string {
  return preprocessMarkdown(markdown);
}

export const MarkdownParser = {
  parse: parseMarkdown,
};
