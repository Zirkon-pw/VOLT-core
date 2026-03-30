import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'volt-sidebar-button-order';

interface ButtonItem {
  id: string;
}

interface SidebarButtonOrderHandlers {
  draggedId: string | null;
  overId: string | null;
  handleDragStart: (event: React.DragEvent<HTMLElement>, id: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (event: React.DragEvent<HTMLElement>, id: string) => void;
  handleDragLeave: (_event: React.DragEvent<HTMLElement>, id: string) => void;
  handleDrop: (event: React.DragEvent<HTMLElement>, targetId: string) => void;
}

function loadOrder(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function saveOrder(ids: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function applyOrder<T extends ButtonItem>(buttons: T[], savedOrder: string[]): T[] {
  if (buttons.length === 0) {
    return [];
  }

  if (savedOrder.length === 0) {
    return [...buttons];
  }

  const byId = new Map(buttons.map((button) => [button.id, button]));
  const ordered: T[] = [];

  for (const id of savedOrder) {
    const button = byId.get(id);

    if (!button) {
      continue;
    }

    ordered.push(button);
    byId.delete(id);
  }

  for (const button of buttons) {
    if (byId.has(button.id)) {
      ordered.push(button);
    }
  }

  return ordered;
}

function idsMatch(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function useSidebarButtonOrder<T extends ButtonItem>(buttons: T[]): [T[], SidebarButtonOrderHandlers] {
  const [order, setOrder] = useState<string[]>(loadOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const orderedButtons = useMemo(() => applyOrder(buttons, order), [buttons, order]);

  useEffect(() => {
    const normalizedIds = orderedButtons.map((button) => button.id);

    if (idsMatch(normalizedIds, order)) {
      return;
    }

    saveOrder(normalizedIds);
    setOrder(normalizedIds);
  }, [order, orderedButtons]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    dragIdRef.current = id;
    setDraggedId(id);
    setOverId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDraggedId(null);
    setOverId(null);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (dragIdRef.current == null) {
      return;
    }

    setOverId(id);
  }, []);

  const handleDragLeave = useCallback((_event: React.DragEvent<HTMLElement>, id: string) => {
    setOverId((currentId) => (currentId === id ? null : currentId));
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();

    const sourceId = dragIdRef.current ?? event.dataTransfer.getData('text/plain');

    if (!sourceId || sourceId === targetId) {
      handleDragEnd();
      return;
    }

    setOrder((previousOrder) => {
      const currentIds = applyOrder(buttons, previousOrder).map((button) => button.id);
      const fromIndex = currentIds.indexOf(sourceId);
      const toIndex = currentIds.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return previousOrder;
      }

      currentIds.splice(fromIndex, 1);
      currentIds.splice(toIndex, 0, sourceId);
      saveOrder(currentIds);

      return currentIds;
    });

    handleDragEnd();
  }, [buttons, handleDragEnd]);

  return [
    orderedButtons,
    {
      draggedId,
      overId,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    },
  ];
}
