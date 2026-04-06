import type { Editor } from '@tiptap/react';

export interface EditorConfig {
  placeholder?: string;
  editable?: boolean;
  onUpdate?: (editor: Editor) => void;
}

export const DEFAULT_EDITOR_CONFIG: Required<Pick<EditorConfig, 'editable'>> = {
  editable: true,
};
