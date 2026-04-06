import { useCallback, useEffect, useRef, useState } from 'react';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;

export function useImageZoom() {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setDimensions({ w: natW, h: natH });

    const padding = 40;
    const canvasW = canvas.clientWidth - padding * 2;
    const canvasH = canvas.clientHeight - padding * 2;
    const fit = Math.min(1, canvasW / natW, canvasH / natH);
    setFitZoom(fit);
    setZoom(fit);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const zoomFit = useCallback(() => {
    setZoom(fitZoom);
  }, [fitZoom]);

  const zoomActual = useCallback(() => {
    setZoom(1);
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setDimensions(null);
  }, []);

  return {
    zoom,
    dimensions,
    canvasRef,
    imgRef,
    handleImageLoad,
    zoomIn,
    zoomOut,
    zoomFit,
    zoomActual,
    resetZoom,
    zoomPercent: Math.round(zoom * 100),
  };
}
