import { useCallback, useEffect, useRef, useState } from 'react';

export function useImageDrag(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollX: canvas.scrollLeft,
      scrollY: canvas.scrollTop,
    };
  }, [canvasRef]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      canvas.scrollLeft = dragStart.current.scrollX - dx;
      canvas.scrollTop = dragStart.current.scrollY - dy;
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, canvasRef]);

  return { dragging, handleMouseDown };
}
