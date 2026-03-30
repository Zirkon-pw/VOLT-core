import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import { usePluginRegistryStore } from '@entities/plugin';
import { translate } from '@shared/i18n';
import type { IconName } from '@shared/ui/icon';
import {
  SlashCommandMenu,
  type SlashCommandMenuHandle,
} from './SlashCommandMenu';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: IconName;
  command: (editor: any, range: any) => void;
}

export function getSlashCommandItems(): SlashCommandItem[] {
  return [
    {
      title: translate('editor.slash.text.title'),
      description: translate('editor.slash.text.description'),
      icon: 'file',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      title: translate('editor.slash.heading1.title'),
      description: translate('editor.slash.heading1.description'),
      icon: 'heading',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      title: translate('editor.slash.heading2.title'),
      description: translate('editor.slash.heading2.description'),
      icon: 'heading',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      title: translate('editor.slash.heading3.title'),
      description: translate('editor.slash.heading3.description'),
      icon: 'heading',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      title: translate('editor.slash.bulletList.title'),
      description: translate('editor.slash.bulletList.description'),
      icon: 'list',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: translate('editor.slash.numberedList.title'),
      description: translate('editor.slash.numberedList.description'),
      icon: 'listOrdered',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: translate('editor.slash.taskList.title'),
      description: translate('editor.slash.taskList.description'),
      icon: 'checkSquare',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: translate('editor.slash.codeBlock.title'),
      description: translate('editor.slash.codeBlock.description'),
      icon: 'code',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: translate('editor.slash.blockquote.title'),
      description: translate('editor.slash.blockquote.description'),
      icon: 'quote',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: translate('editor.slash.table.title'),
      description: translate('editor.slash.table.description'),
      icon: 'table',
      command: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: translate('editor.slash.image.title'),
      description: translate('editor.slash.image.description'),
      icon: 'image',
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(new CustomEvent('volt:pick-image'));
      },
    },
    {
      title: translate('editor.slash.divider.title'),
      description: translate('editor.slash.divider.description'),
      icon: 'minus',
      command: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];
}

const slashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: slashCommandPluginKey,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: SlashCommandItem;
        }) => {
          props.command(editor, range);
        },
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          const normalizedQuery = query.toLowerCase();
          const pluginItems = usePluginRegistryStore.getState().slashCommands.map((cmd) => ({
            title: cmd.title,
            description: cmd.description,
            icon: cmd.icon,
            command: (editor: any, range: any) => {
              editor.chain().focus().deleteRange(range).run();
              cmd.callback();
            },
          }));

          return [...getSlashCommandItems(), ...pluginItems].filter((item) => (
            item.title.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery)
          ));
        },
        render: () => {
          let popup: HTMLDivElement | null = null;
          let root: Root | null = null;
          const menuRef = createRef<SlashCommandMenuHandle>();

          return {
            onStart: (props: any) => {
              popup = document.createElement('div');
              popup.style.position = 'absolute';
              popup.style.zIndex = '50';
              document.body.appendChild(popup);

              updatePosition(popup, props.clientRect);

              root = createRoot(popup);
              root.render(
                createElement(SlashCommandMenu, {
                  ref: menuRef,
                  items: props.items,
                  command: props.command,
                }),
              );
            },

            onUpdate: (props: any) => {
              if (!popup || !root) return;

              updatePosition(popup, props.clientRect);

              root.render(
                createElement(SlashCommandMenu, {
                  ref: menuRef,
                  items: props.items,
                  command: props.command,
                }),
              );
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                return true;
              }
              return menuRef.current?.onKeyDown(props.event) ?? false;
            },

            onExit: () => {
              root?.unmount();
              root = null;
              popup?.remove();
              popup = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

function updatePosition(
  popup: HTMLDivElement,
  clientRect: (() => DOMRect | null) | undefined,
) {
  const rect = clientRect?.();
  if (!rect) return;

  const menuHeight = 320;
  const left = rect.left;
  let top = rect.bottom + 4;

  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}
