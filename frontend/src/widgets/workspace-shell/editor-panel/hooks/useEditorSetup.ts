import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Markdown } from 'tiptap-markdown';
import 'katex/dist/katex.min.css';
import { translate } from '@shared/i18n';
import { isSingleHttpUrl } from '@shared/lib/remoteUrl';
import { SlashCommand } from '../extensions/slashCommand';
import { CodeBlockWithLanguage } from '../extensions/CodeBlockWithLanguage';
import { EmbedBlock } from '../extensions/EmbedBlock';
import { MathBlock } from '../extensions/MathBlock';
import { FindInFileHighlights } from '../extensions/FindInFileHighlights';

interface UseEditorSetupOptions {
  onUpdate?: (editor: Editor) => void;
  placeholder?: string;
  editable?: boolean;
}

export function useEditorSetup({
  onUpdate,
  placeholder = translate('editor.placeholder'),
  editable = true,
}: UseEditorSetupOptions = {}) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
      }),
      Code,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockWithLanguage,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
              renderHTML: (attributes: Record<string, unknown>) => {
                if (!attributes.backgroundColor) return {};
                return { style: `background-color: ${attributes.backgroundColor}` };
              },
            },
          };
        },
      }),
      TableHeader,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      EmbedBlock,
      MathBlock,
      FindInFileHighlights,
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      SlashCommand,
    ],
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed as Editor);
    },
    editorProps: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (!isSingleHttpUrl(text)) {
          return false;
        }

        const { selection, schema } = view.state;
        if (!selection.empty) {
          return false;
        }

        const parent = selection.$from.parent;
        if (parent.type.name !== 'paragraph' || parent.textContent.trim() !== '') {
          return false;
        }

        const embedBlock = schema.nodes.embedBlock;
        if (!embedBlock) {
          return false;
        }

        event.preventDefault();
        const tr = view.state.tr.replaceSelectionWith(embedBlock.create({ url: text.trim() })).scrollIntoView();
        view.dispatch(tr);
        return true;
      },
    },
  });

  return editor;
}
