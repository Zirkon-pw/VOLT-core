import { Node, mergeAttributes } from '@tiptap/core';
import { type NodeViewRendererProps } from '@tiptap/core';
import katex from 'katex';

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-math-inline': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('span');
      dom.classList.add('math-inline-node');
      dom.setAttribute('data-math-inline', '');
      dom.contentEditable = 'false';

      let currentNode = props.node;
      let editing = false;
      let input: HTMLInputElement | null = null;

      const getNodePos = () => {
        if (typeof props.getPos !== 'function') {
          return null;
        }

        try {
          return props.getPos();
        } catch {
          return null;
        }
      };

      const applyLatex = (latex: string) => {
        const pos = getNodePos();
        if (pos == null) {
          return;
        }

        const { state, dispatch } = props.editor.view;
        const tr = state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          latex,
        });
        dispatch(tr);
        currentNode = tr.doc.nodeAt(pos) ?? currentNode;
      };

      const renderContent = () => {
        const latex = currentNode.attrs.latex as string;
        if (!latex) {
          dom.innerHTML = '<span class="math-placeholder">$formula$</span>';
          return;
        }
        try {
          dom.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          dom.textContent = latex;
        }
      };

      renderContent();

      const startEditing = () => {
        if (editing) return;
        editing = true;
        const latex = currentNode.attrs.latex as string;
        input = document.createElement('input');
        input.type = 'text';
        input.value = latex;
        input.className = 'math-inline-input';
        input.placeholder = 'LaTeX...';
        input.addEventListener('mousedown', (event) => {
          event.stopPropagation();
        });

        const commitEdit = () => {
          if (!input || !editing) return;
          editing = false;
          const newLatex = input.value;
          dom.innerHTML = '';
          applyLatex(newLatex);
          renderContent();
        };

        input.addEventListener('blur', commitEdit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editing = false;
            dom.innerHTML = '';
            renderContent();
            props.editor.commands.focus();
          } else {
            e.stopPropagation();
          }
        });

        dom.innerHTML = '';
        dom.appendChild(input);
        requestAnimationFrame(() => {
          input?.focus();
          input?.select();
        });
      };

      dom.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startEditing();
      });

      return {
        dom,
        update(node) {
          if (node.type.name !== 'mathInline') return false;
          currentNode = node;
          if (!editing) {
            renderContent();
          }
          return true;
        },
        selectNode() {
          dom.classList.add('ProseMirror-selectednode');
          if (!editing && !(currentNode.attrs.latex as string)) {
            startEditing();
          }
        },
        deselectNode() {
          dom.classList.remove('ProseMirror-selectednode');
        },
        stopEvent(event) {
          return editing || event.target === input;
        },
        ignoreMutation() {
          return true;
        },
        destroy() {
          input?.remove();
          input = null;
          editing = false;
        },
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`$${node.attrs.latex}$`);
        },
        parse: {
          setup(markdownit: any) {
            // Add inline math rule: $...$
            markdownit.inline.ruler.after('escape', 'math_inline', (state: any, silent: boolean) => {
              if (state.src[state.pos] !== '$') return false;
              // Ensure it's not $$
              if (state.src[state.pos + 1] === '$') return false;

              const start = state.pos + 1;
              let end = start;
              while (end < state.posMax) {
                if (state.src[end] === '$' && state.src[end - 1] !== '\\') break;
                end++;
              }

              if (end >= state.posMax) return false;
              if (start === end) return false;

              if (!silent) {
                const token = state.push('math_inline', 'span', 0);
                token.content = state.src.slice(start, end);
                token.attrSet('data-math-inline', '');
                token.attrSet('data-latex', state.src.slice(start, end));
              }

              state.pos = end + 1;
              return true;
            });

            // Renderer for math_inline tokens
            markdownit.renderer.rules.math_inline = (tokens: any[], idx: number) => {
              const latex = tokens[idx].content;
              return `<span data-math-inline="" data-latex="${escapeHtml(latex)}">${escapeHtml(latex)}</span>`;
            };
          },
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('span[data-math-inline]').forEach((el) => {
              const latex = el.getAttribute('data-latex') || el.textContent || '';
              el.setAttribute('data-math-inline', '');
              el.textContent = '';
              // Store latex in a way tiptap can parse
              el.setAttribute('latex', latex);
            });
          },
        },
      },
    };
  },
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
