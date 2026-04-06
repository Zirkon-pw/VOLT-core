import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { EditorView, ViewMutationRecord } from '@tiptap/pm/view';
import { translate } from '@shared/i18n';
import { getFloatingMenuPresentation } from '../hooks/useEditorResponsiveMode';

import './CodeBlock.css';

const lowlight = createLowlight(all);
const LANGUAGES = lowlight.listLanguages().sort();
const DROPDOWN_WIDTH = 250;
const MAX_DROPDOWN_HEIGHT = 280;
const MIN_DROPDOWN_HEIGHT = 120;
const VIEWPORT_PADDING = 12;
const DROPDOWN_OFFSET = 6;
const CLOSE_ANIMATION_MS = 150;

interface LanguageOption {
  value: string;
  label: string;
  searchValue: string;
}

function createLanguageSelector(
  view: EditorView,
  getPos: () => number | undefined,
  initialLanguage: string,
) {
  let open = false;
  let search = '';
  let currentLanguage = initialLanguage;
  let removeDropdownTimer: number | null = null;

  const getPlainTextLabel = () => translate('editor.codeBlock.language.plainText');
  const getSearchPlaceholder = () => translate('editor.codeBlock.language.searchPlaceholder');
  const getEmptyLabel = () => translate('editor.codeBlock.language.empty');
  const getLanguageLabel = (lang: string) => lang || getPlainTextLabel();
  const getLanguageOptions = (query: string): LanguageOption[] => {
    const normalizedQuery = query.trim().toLowerCase();
    const plainTextLabel = getPlainTextLabel();
    const options: LanguageOption[] = [
      {
        value: '',
        label: plainTextLabel,
        searchValue: `${plainTextLabel} plain text no language`,
      },
      ...LANGUAGES.map((lang) => ({
        value: lang,
        label: lang,
        searchValue: lang,
      })),
    ];

    if (normalizedQuery.length === 0) {
      return options;
    }

    return options.filter((option) => option.searchValue.toLowerCase().includes(normalizedQuery));
  };

  function clearRemoveDropdownTimer() {
    if (removeDropdownTimer != null) {
      window.clearTimeout(removeDropdownTimer);
      removeDropdownTimer = null;
    }
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'codeblock-lang-button';
  button.contentEditable = 'false';
  button.tabIndex = 0;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', translate('common.language'));
  button.dataset.testid = 'codeblock-language-button';
  button.dataset.open = 'false';

  const buttonText = document.createElement('span');
  buttonText.className = 'codeblock-lang-button-text';
  buttonText.textContent = getLanguageLabel(currentLanguage);

  const arrow = document.createElement('span');
  arrow.className = 'codeblock-lang-button-arrow';
  arrow.textContent = '▼';
  arrow.setAttribute('aria-hidden', 'true');

  button.appendChild(buttonText);
  button.appendChild(arrow);

  const dropdown = document.createElement('div');
  dropdown.className = 'codeblock-lang-dropdown';
  dropdown.contentEditable = 'false';
  dropdown.dataset.testid = 'codeblock-language-dropdown';
  dropdown.style.position = 'fixed';
  dropdown.style.top = '0';
  dropdown.style.left = '0';
  dropdown.style.width = `${DROPDOWN_WIDTH}px`;
  dropdown.dataset.open = 'false';
  dropdown.dataset.position = 'below';
  dropdown.dataset.presentation = 'popover';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'codeblock-lang-search';
  searchInput.placeholder = getSearchPlaceholder();
  searchInput.dataset.testid = 'codeblock-language-search';
  dropdown.appendChild(searchInput);

  const list = document.createElement('div');
  list.className = 'codeblock-lang-list';
  dropdown.appendChild(list);

  function setOpenState(isOpen: boolean) {
    button.dataset.open = isOpen ? 'true' : 'false';
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    dropdown.dataset.open = isOpen ? 'true' : 'false';
  }

  function renderList() {
    list.innerHTML = '';
    const filtered = getLanguageOptions(search);

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'codeblock-lang-no-results';
      empty.textContent = getEmptyLabel();
      list.appendChild(empty);
      return;
    }

    for (const option of filtered) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'codeblock-lang-item';
      item.dataset.testid = 'codeblock-language-item';
      item.dataset.language = option.value || 'plain-text';
      if (option.value === currentLanguage) {
        item.classList.add('codeblock-lang-item-active');
      }
      item.textContent = option.label;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectLanguage(option.value);
      });
      list.appendChild(item);
    }
  }

  function updateDropdownPosition() {
    const presentation = getFloatingMenuPresentation();
    dropdown.dataset.presentation = presentation;

    if (presentation === 'sheet') {
      dropdown.style.left = `${VIEWPORT_PADDING}px`;
      dropdown.style.top = 'auto';
      dropdown.style.bottom = `${VIEWPORT_PADDING}px`;
      dropdown.style.width = `calc(100vw - ${VIEWPORT_PADDING * 2}px)`;
      dropdown.style.maxHeight = 'min(52vh, 360px)';
      dropdown.dataset.position = 'below';
      return;
    }

    dropdown.style.bottom = 'auto';
    dropdown.style.width = `${DROPDOWN_WIDTH}px`;
    const buttonRect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom - VIEWPORT_PADDING;
    const spaceAbove = buttonRect.top - VIEWPORT_PADDING;
    const positionAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableHeight = positionAbove ? spaceAbove : spaceBelow;
    const viewportMaxHeight = Math.max(80, viewportHeight - VIEWPORT_PADDING * 2);
    const maxHeight = Math.min(
      viewportMaxHeight,
      Math.max(MIN_DROPDOWN_HEIGHT, Math.min(MAX_DROPDOWN_HEIGHT, availableHeight)),
    );

    dropdown.dataset.position = positionAbove ? 'above' : 'below';
    dropdown.style.maxHeight = `${maxHeight}px`;

    const dropdownHeight = Math.min(dropdown.scrollHeight || maxHeight, maxHeight);
    const preferredLeft = buttonRect.right - DROPDOWN_WIDTH;
    const maxLeft = viewportWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING;
    const left = Math.min(Math.max(VIEWPORT_PADDING, preferredLeft), Math.max(VIEWPORT_PADDING, maxLeft));
    const top = positionAbove
      ? Math.max(VIEWPORT_PADDING, buttonRect.top - dropdownHeight - DROPDOWN_OFFSET)
      : Math.max(
          VIEWPORT_PADDING,
          Math.min(
            viewportHeight - VIEWPORT_PADDING - dropdownHeight,
            buttonRect.bottom + DROPDOWN_OFFSET,
          ),
        );

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

  function selectLanguage(lang: string) {
    currentLanguage = lang;
    buttonText.textContent = getLanguageLabel(lang);
    closeDropdown();

    const pos = getPos();
    if (pos == null) return;
    const { tr } = view.state;
    tr.setNodeAttribute(pos, 'language', lang);
    view.dispatch(tr);
  }

  function openDropdown() {
    if (open) return;
    open = true;
    search = '';
    searchInput.value = '';
    searchInput.placeholder = getSearchPlaceholder();
    clearRemoveDropdownTimer();

    if (!dropdown.parentNode) {
      document.body.appendChild(dropdown);
    }

    renderList();
    setOpenState(true);
    updateDropdownPosition();
    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscapeKey, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateDropdownPosition);

    requestAnimationFrame(() => {
      if (!open) return;
      updateDropdownPosition();
      searchInput.focus({ preventScroll: true });
    });
  }

  function closeDropdown({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
    if (!open && !dropdown.parentNode) return;
    open = false;
    setOpenState(false);
    document.removeEventListener('mousedown', handleOutsideClick, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', updateDropdownPosition);

    if (restoreFocus) {
      button.focus({ preventScroll: true });
    }

    clearRemoveDropdownTimer();
    removeDropdownTimer = window.setTimeout(() => {
      if (!open && dropdown.parentNode) {
        dropdown.parentNode.removeChild(dropdown);
      }
    }, CLOSE_ANIMATION_MS);
  }

  function handleOutsideClick(e: MouseEvent) {
    if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
      closeDropdown();
    }
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown({ restoreFocus: true });
    }
  }

  function handleScroll() {
    if (open) {
      updateDropdownPosition();
    }
  }

  function toggleDropdown() {
    if (open) {
      closeDropdown({ restoreFocus: true });
      return;
    }

    openDropdown();
  }

  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  });

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        openDropdown();
      } else {
        searchInput.focus({ preventScroll: true });
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown({ restoreFocus: true });
    }
  });

  searchInput.addEventListener('input', () => {
    search = searchInput.value;
    renderList();
    updateDropdownPosition();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const options = getLanguageOptions(search);
      if (options.length === 0) return;
      const selected = search.trim().length > 0
        ? options[0]
        : options.find((option) => option.value === currentLanguage) ?? options[0];
      selectLanguage(selected.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown({ restoreFocus: true });
    }
    e.stopPropagation();
  });

  function updateLanguage(lang: string) {
    currentLanguage = lang;
    buttonText.textContent = getLanguageLabel(lang);
    button.setAttribute('aria-label', translate('common.language'));
    if (open) {
      renderList();
      updateDropdownPosition();
    }
  }

  function stopEvent(event: Event) {
    const target = event.target;
    return target instanceof Node && (button.contains(target) || dropdown.contains(target));
  }

  function ignoreMutation(mutation: ViewMutationRecord, codeElement: HTMLElement) {
    if (mutation.type === 'selection') {
      return false;
    }

    const target = mutation.target;
    if (!(target instanceof Node)) {
      return true;
    }

    if (target === codeElement || codeElement.contains(target)) {
      return false;
    }

    return true;
  }

  function destroy() {
    clearRemoveDropdownTimer();
    if (dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
    document.removeEventListener('mousedown', handleOutsideClick, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', updateDropdownPosition);
  }

  return { button, updateLanguage, stopEvent, ignoreMutation, destroy };
}

export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, view, getPos }: { node: PmNode; view: EditorView; getPos: () => number | undefined }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'codeblock-wrapper';

      const { button, updateLanguage, stopEvent, ignoreMutation, destroy } = createLanguageSelector(
        view,
        getPos,
        node.attrs.language || '',
      );

      wrapper.appendChild(button);

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.classList.add('hljs');

      const lang = node.attrs.language;
      if (lang && lang !== '' && lang !== 'null') {
        code.classList.add(`language-${lang}`);
      }

      pre.appendChild(code);
      wrapper.appendChild(pre);

      return {
        dom: wrapper,
        contentDOM: code,
        stopEvent,
        ignoreMutation(mutation) {
          return ignoreMutation(mutation, code);
        },
        update(updatedNode: PmNode) {
          if (updatedNode.type.name !== 'codeBlock') return false;

          const newLang = updatedNode.attrs.language;
          updateLanguage(newLang || '');

          code.className = 'hljs';

          if (newLang && newLang !== '' && newLang !== 'null') {
            code.classList.add(`language-${newLang}`);
          }

          return true;
        },
        destroy() {
          destroy();
        },
      };
    };
  },
}).configure({
  lowlight,
  defaultLanguage: null,
  HTMLAttributes: {
    class: 'code-block',
  },
});
