/**
 * Pre-processes markdown content before passing to Tiptap.
 * Handles Obsidian-specific syntax and wiki-links.
 */

/**
 * Strip YAML frontmatter (--- ... ---) from the beginning of the content.
 */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

/**
 * Convert wiki-links [[target|display]] to standard markdown [display](target.md).
 * Also handles image embeds ![[image.png]].
 */
function convertWikiLinks(content: string): string {
  // Image embeds: ![[file.ext]]
  content = content.replace(/!\[\[([^\]|]+?)(\|([^\]]*))?\]\]/g, (_match, target: string, _pipe, alt: string | undefined) => {
    const displayText = alt ?? target;
    return `![${displayText}](${target})`;
  });

  // Wiki-links: [[target|display]] or [[target]]
  content = content.replace(/\[\[([^\]|]+?)(\|([^\]]*))?\]\]/g, (_match, target: string, _pipe, display: string | undefined) => {
    const displayText = display ?? target;
    const href = /\.\w+$/.test(target) ? target : `${target}.md`;
    return `[${displayText}](${href})`;
  });

  return content;
}

/**
 * Convert Obsidian callouts (> [!type] title) to styled blockquotes.
 */
function convertCallouts(content: string): string {
  return content.replace(
    /^(>\s*)\[!(\w+)\]\s*(.*?)$/gm,
    (_match, prefix: string, type: string, title: string) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return `${prefix}**${label}${title ? `: ${title}` : ''}**`;
    },
  );
}

/**
 * Full preprocessing pipeline for markdown content.
 */
export function preprocessMarkdown(content: string): string {
  let result = content;
  result = stripFrontmatter(result);
  result = convertWikiLinks(result);
  result = convertCallouts(result);
  return result;
}
