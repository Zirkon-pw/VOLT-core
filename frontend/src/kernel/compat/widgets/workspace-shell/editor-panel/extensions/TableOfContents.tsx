import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './TableOfContents.module.scss';

const ACTIVE_LINE_RATIO = 0.22;
const MIN_PANE_WIDTH = 960;
const BOTTOM_TOLERANCE_PX = 2;
const REVEAL_PADDING_PX = 14;

interface TocHeading {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

interface TableOfContentsProps {
  editor: Editor;
  scrollContainer: HTMLDivElement | null;
}

function extractHeadings(editor: Editor): TocHeading[] {
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

function getHeadingElement(editor: Editor, pos: number): HTMLElement | null {
  try {
    const nodeElement = editor.view.nodeDOM(pos);
    if (nodeElement instanceof HTMLElement && /^H[1-3]$/.test(nodeElement.tagName)) {
      return nodeElement;
    }
  } catch {
    // Ignore stale DOM lookups during editor updates.
  }

  try {
    const domAtPos = editor.view.domAtPos(Math.min(pos + 1, editor.state.doc.content.size));
    const element = domAtPos.node instanceof HTMLElement
      ? domAtPos.node
      : domAtPos.node.parentElement;
    return element?.closest('h1, h2, h3') ?? null;
  } catch {
    return null;
  }
}

function isScrolledToBottom(element: HTMLElement) {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - BOTTOM_TOLERANCE_PX;
}

function revealElementInContainer(
  container: HTMLElement | null,
  element: HTMLElement | null,
  padding = REVEAL_PADDING_PX,
) {
  if (!container || !element) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.top < containerRect.top + padding) {
    container.scrollTop -= containerRect.top + padding - elementRect.top;
    return;
  }

  if (elementRect.bottom > containerRect.bottom - padding) {
    container.scrollTop += elementRect.bottom - (containerRect.bottom - padding);
  }
}

export function TableOfContents({ editor, scrollContainer }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const [isPaneWideEnough, setIsPaneWideEnough] = useState(false);
  const syncRafRef = useRef<number | null>(null);
  const revealRafRef = useRef<number | null>(null);
  const navigationRafRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const markerRefs = useRef(new Map<number, HTMLButtonElement>());
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    const update = () => {
      setHeadings(extractHeadings(editor));
    };

    update();
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);

  useEffect(() => {
    if (!scrollContainer) {
      setIsPaneWideEnough(false);
      return undefined;
    }

    const editorRoot = editor.view.dom as HTMLElement;
    const paneElement = scrollContainer.closest<HTMLElement>('[data-pane-id]');
    const updateMeasurements = () => {
      const measuredWidth = paneElement?.clientWidth ?? scrollContainer.clientWidth;
      setIsPaneWideEnough(measuredWidth >= MIN_PANE_WIDTH);
    };

    updateMeasurements();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMeasurements);
      return () => {
        window.removeEventListener('resize', updateMeasurements);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateMeasurements();
    });

    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(editorRoot);
    if (paneElement) {
      resizeObserver.observe(paneElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [editor, scrollContainer]);

  const syncActiveHeading = useCallback(() => {
    if (headings.length === 0 || !scrollContainer) {
      setActivePos(headings[0]?.pos ?? null);
      return;
    }

    if (isScrolledToBottom(scrollContainer)) {
      setActivePos(headings[headings.length - 1]?.pos ?? null);
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const activationLine = containerRect.top + (containerRect.height * ACTIVE_LINE_RATIO);
    let nextActive = headings[0]?.pos ?? null;

    for (const heading of headings) {
      const element = getHeadingElement(editor, heading.pos);
      if (!element) {
        continue;
      }

      if (element.getBoundingClientRect().top <= activationLine) {
        nextActive = heading.pos;
      } else {
        break;
      }
    }

    setActivePos(nextActive);
  }, [editor, headings, scrollContainer]);

  const scheduleSyncActiveHeading = useCallback(() => {
    if (syncRafRef.current != null) {
      cancelAnimationFrame(syncRafRef.current);
    }

    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = null;
      syncActiveHeading();
    });
  }, [syncActiveHeading]);

  useEffect(() => () => {
    if (syncRafRef.current != null) {
      cancelAnimationFrame(syncRafRef.current);
    }
    if (revealRafRef.current != null) {
      cancelAnimationFrame(revealRafRef.current);
    }
    if (navigationRafRef.current != null) {
      cancelAnimationFrame(navigationRafRef.current);
    }
  }, []);

  useEffect(() => {
    scheduleSyncActiveHeading();
  }, [headings, isPaneWideEnough, scheduleSyncActiveHeading]);

  useEffect(() => {
    if (!scrollContainer) {
      return undefined;
    }

    scrollContainer.addEventListener('scroll', scheduleSyncActiveHeading, { passive: true });
    window.addEventListener('resize', scheduleSyncActiveHeading);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        scrollContainer.removeEventListener('scroll', scheduleSyncActiveHeading);
        window.removeEventListener('resize', scheduleSyncActiveHeading);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleSyncActiveHeading();
    });
    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(editor.view.dom as HTMLElement);
    const paneElement = scrollContainer.closest<HTMLElement>('[data-pane-id]');
    if (paneElement) {
      resizeObserver.observe(paneElement);
    }

    return () => {
      scrollContainer.removeEventListener('scroll', scheduleSyncActiveHeading);
      window.removeEventListener('resize', scheduleSyncActiveHeading);
      resizeObserver.disconnect();
    };
  }, [editor, scheduleSyncActiveHeading, scrollContainer]);

  useEffect(() => {
    if (activePos == null) {
      return undefined;
    }

    if (revealRafRef.current != null) {
      cancelAnimationFrame(revealRafRef.current);
    }

    revealRafRef.current = requestAnimationFrame(() => {
      revealRafRef.current = null;
      revealElementInContainer(railRef.current, markerRefs.current.get(activePos) ?? null, 10);
      revealElementInContainer(listRef.current, itemRefs.current.get(activePos) ?? null);
    });

    return () => {
      if (revealRafRef.current != null) {
        cancelAnimationFrame(revealRafRef.current);
        revealRafRef.current = null;
      }
    };
  }, [activePos]);

  const scrollToHeading = useCallback((pos: number) => {
    setActivePos(pos);
    editor.chain().focus(pos + 1).scrollIntoView().run();

    if (navigationRafRef.current != null) {
      cancelAnimationFrame(navigationRafRef.current);
    }

    navigationRafRef.current = requestAnimationFrame(() => {
      navigationRafRef.current = null;
      getHeadingElement(editor, pos)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }, [editor]);

  const bindMarkerRef = useCallback((pos: number, node: HTMLButtonElement | null) => {
    if (node) {
      markerRefs.current.set(pos, node);
      return;
    }

    markerRefs.current.delete(pos);
  }, []);

  const bindItemRef = useCallback((pos: number, node: HTMLButtonElement | null) => {
    if (node) {
      itemRefs.current.set(pos, node);
      return;
    }

    itemRefs.current.delete(pos);
  }, []);

  if (headings.length === 0 || !isPaneWideEnough) {
    return null;
  }

  return (
    <nav
      className={styles.tocOverlay}
      aria-label="Table of contents"
      data-testid="editor-toc"
    >
      <div className={styles.tocDock} data-testid="editor-toc-dock">
        <div className={styles.tocPanel} data-testid="editor-toc-panel">
          <ul ref={listRef} className={styles.tocList}>
            {headings.map((heading) => {
              const isActive = activePos === heading.pos;
              const levelClass = heading.level === 2
                ? styles.tocLevel2
                : heading.level === 3
                  ? styles.tocLevel3
                  : '';

              return (
                <li key={heading.pos} className={styles.tocListItem}>
                  <button
                    type="button"
                    ref={(node) => bindItemRef(heading.pos, node)}
                    className={`${styles.tocItem} ${levelClass} ${isActive ? styles.tocItemActive : ''}`}
                    data-testid="editor-toc-item"
                    aria-current={isActive ? 'location' : undefined}
                    onClick={() => scrollToHeading(heading.pos)}
                    title={heading.text}
                  >
                    {heading.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div ref={railRef} className={styles.tocRail} data-testid="editor-toc-rail">
          {headings.map((heading) => {
            const isActive = activePos === heading.pos;
            return (
              <button
                key={heading.pos}
                type="button"
                ref={(node) => bindMarkerRef(heading.pos, node)}
                className={`${styles.tocMarker} ${isActive ? styles.tocMarkerActive : ''}`}
                data-testid="editor-toc-marker"
                aria-label={heading.text}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => scrollToHeading(heading.pos)}
                title={heading.text}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
