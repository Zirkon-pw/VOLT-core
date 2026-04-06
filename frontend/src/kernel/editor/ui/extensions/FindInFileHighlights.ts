import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface FindInFileMatch {
  from: number;
  to: number;
}

interface FindInFileHighlightMeta {
  matches: FindInFileMatch[];
  currentIndex: number;
}

interface FindInFileHighlightState {
  matches: FindInFileMatch[];
  currentIndex: number;
  decorations: DecorationSet;
}

export const findInFileHighlightsPluginKey = new PluginKey<FindInFileHighlightState>('findInFileHighlights');

function clampCurrentIndex(currentIndex: number, matches: FindInFileMatch[]): number {
  if (matches.length === 0) {
    return 0;
  }

  return Math.min(Math.max(currentIndex, 0), matches.length - 1);
}

function normalizeMatches(doc: ProseMirrorNode, matches: FindInFileMatch[]): FindInFileMatch[] {
  const maxPos = doc.content.size;

  return matches.filter((match) => (
    Number.isInteger(match.from)
    && Number.isInteger(match.to)
    && match.from >= 0
    && match.to <= maxPos
    && match.from < match.to
  ));
}

function buildDecorations(
  doc: ProseMirrorNode,
  matches: FindInFileMatch[],
  currentIndex: number,
): DecorationSet {
  if (matches.length === 0) {
    return DecorationSet.empty;
  }

  const activeIndex = clampCurrentIndex(currentIndex, matches);
  const decorations = matches.map((match, index) => Decoration.inline(match.from, match.to, {
    class: index === activeIndex
      ? 'find-in-file-match find-in-file-match-current'
      : 'find-in-file-match',
  }));

  return DecorationSet.create(doc, decorations);
}

function mapMatches(
  doc: ProseMirrorNode,
  matches: FindInFileMatch[],
  transaction: Transaction,
): FindInFileMatch[] {
  const mappedMatches = matches.map((match) => ({
    from: transaction.mapping.map(match.from),
    to: transaction.mapping.map(match.to),
  }));

  return normalizeMatches(doc, mappedMatches);
}

export const FindInFileHighlights = Extension.create({
  name: 'findInFileHighlights',

  addProseMirrorPlugins() {
    return [
      new Plugin<FindInFileHighlightState>({
        key: findInFileHighlightsPluginKey,
        state: {
          init: () => ({
            matches: [],
            currentIndex: 0,
            decorations: DecorationSet.empty,
          }),
          apply: (transaction, pluginState) => {
            const meta = transaction.getMeta(findInFileHighlightsPluginKey) as FindInFileHighlightMeta | undefined;

            if (meta) {
              const matches = normalizeMatches(transaction.doc, meta.matches);
              const currentIndex = clampCurrentIndex(meta.currentIndex, matches);

              return {
                matches,
                currentIndex,
                decorations: buildDecorations(transaction.doc, matches, currentIndex),
              };
            }

            if (!transaction.docChanged) {
              return pluginState;
            }

            const matches = mapMatches(transaction.doc, pluginState.matches, transaction);
            const currentIndex = clampCurrentIndex(pluginState.currentIndex, matches);

            return {
              matches,
              currentIndex,
              decorations: buildDecorations(transaction.doc, matches, currentIndex),
            };
          },
        },
        props: {
          decorations: (state) => findInFileHighlightsPluginKey.getState(state)?.decorations ?? DecorationSet.empty,
        },
      }),
    ];
  },
});
