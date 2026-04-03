import { Node, mergeAttributes } from '@tiptap/core';
import { type NodeViewRendererProps } from '@tiptap/core';
import katex from 'katex';

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-math-block': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      dom.classList.add('math-block-node');
      dom.setAttribute('data-math-block', '');
      dom.contentEditable = 'false';

      const renderArea = document.createElement('div');
      renderArea.className = 'math-block-render';
      dom.appendChild(renderArea);

      let currentNode = props.node;
      let editing = false;
      let textarea: HTMLTextAreaElement | null = null;

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
          renderArea.innerHTML = '<span class="math-placeholder">$$formula$$</span>';
          return;
        }
        try {
          renderArea.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
          });
        } catch {
          renderArea.textContent = latex;
        }
      };

      renderContent();

      const startEditing = () => {
        if (editing) return;
        editing = true;
        const latex = currentNode.attrs.latex as string;

        textarea = document.createElement('textarea');
        textarea.value = latex;
        textarea.className = 'math-block-textarea';
        textarea.placeholder = 'LaTeX...';
        textarea.rows = Math.max(2, (latex.match(/\n/g)?.length ?? 0) + 2);
        textarea.addEventListener('mousedown', (event) => {
          event.stopPropagation();
        });

        const commitEdit = () => {
          if (!textarea || !editing) return;
          editing = false;
          const newLatex = textarea.value;
          textarea.remove();
          textarea = null;
          applyLatex(newLatex);
          renderContent();
        };

        textarea.addEventListener('blur', commitEdit);
        textarea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commitEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editing = false;
            textarea?.remove();
            textarea = null;
            renderContent();
            props.editor.commands.focus();
          } else {
            e.stopPropagation();
          }
        });

        dom.appendChild(textarea);
        requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.select();
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
          if (node.type.name !== 'mathBlock') return false;
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
          return editing || event.target === textarea;
        },
        ignoreMutation() {
          return true;
        },
        destroy() {
          textarea?.remove();
          textarea = null;
          editing = false;
        },
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`$$\n${node.attrs.latex}\n$$`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: any) {
            // Add block math rule: $$...$$
            markdownit.block.ruler.before('fence', 'math_block', (state: any, startLine: number, endLine: number, silent: boolean) => {
              const startPos = state.bMarks[startLine] + state.tShift[startLine];
              const maxPos = state.eMarks[startLine];

              if (startPos + 2 > maxPos) return false;
              if (state.src.slice(startPos, startPos + 2) !== '$$') return false;

              // Check that rest of line after $$ is empty
              const afterDollar = state.src.slice(startPos + 2, maxPos).trim();
              if (afterDollar) return false;

              let nextLine = startLine;
              let found = false;

              while (++nextLine < endLine) {
                const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
                const lineMax = state.eMarks[nextLine];
                const line = state.src.slice(lineStart, lineMax).trim();

                if (line === '$$') {
                  found = true;
                  break;
                }
              }

              if (!found) return false;
              if (silent) return true;

              const token = state.push('math_block', 'div', 0);
              token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false).trim();
              token.attrSet('data-math-block', '');
              token.attrSet('data-latex', token.content);
              token.map = [startLine, nextLine + 1];

              state.line = nextLine + 1;
              return true;
            });

            markdownit.renderer.rules.math_block = (tokens: any[], idx: number) => {
              const latex = tokens[idx].content;
              return `<div data-math-block="" data-latex="${escapeHtml(latex)}">${escapeHtml(latex)}</div>`;
            };
          },
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('div[data-math-block]').forEach((el) => {
              const latex = el.getAttribute('data-latex') || el.textContent || '';
              el.setAttribute('data-math-block', '');
              el.textContent = '';
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
