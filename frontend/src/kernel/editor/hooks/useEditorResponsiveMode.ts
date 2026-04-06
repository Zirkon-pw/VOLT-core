import { useEffect, useMemo, useState } from 'react';

export type EditorResponsiveMode = 'desktop' | 'compact' | 'touch';

export interface EditorResponsiveModeOptions {
  element: HTMLElement | null;
}

export function resolveEditorResponsiveMode(width: number, viewportWidth: number, isCoarsePointer: boolean) {
  if (isCoarsePointer || viewportWidth <= 768) {
    return 'touch' as const;
  }

  if (width >= 720) {
    return 'desktop' as const;
  }

  return 'compact' as const;
}

function getViewportWidth() {
  if (typeof window === 'undefined') {
    return 1024;
  }

  return window.innerWidth;
}

function getIsCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(pointer: coarse)').matches;
}

export function getFloatingMenuPresentation(): 'popover' | 'sheet' {
  return 'popover';
}

export function useEditorResponsiveMode({ element }: EditorResponsiveModeOptions): EditorResponsiveMode {
  const [mode, setMode] = useState<EditorResponsiveMode>(() => {
    const width = element?.clientWidth ?? getViewportWidth();
    return resolveEditorResponsiveMode(width, getViewportWidth(), getIsCoarsePointer());
  });

  useEffect(() => {
    const updateMode = () => {
      const width = element?.clientWidth ?? getViewportWidth();
      setMode(resolveEditorResponsiveMode(width, getViewportWidth(), getIsCoarsePointer()));
    };

    updateMode();

    const resizeObserver = typeof ResizeObserver === 'undefined' || !element
      ? null
      : new ResizeObserver(() => updateMode());
    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }

    const coarsePointerQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;

    window.addEventListener('resize', updateMode);
    coarsePointerQuery?.addEventListener?.('change', updateMode);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMode);
      coarsePointerQuery?.removeEventListener?.('change', updateMode);
    };
  }, [element]);

  return useMemo(() => mode, [mode]);
}
