import { useEffect, useState } from 'react';
import { readImageBase64, dataUrlToBlobUrl } from '@plugins/image-service';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@shared/ui/icon';
import { useImageZoom } from './useImageZoom';
import { useImageDrag } from './useImageDrag';
import styles from './ImageViewer.module.scss';

interface ImageViewerProps {
  voltPath: string;
  filePath: string;
}

export function ImageViewer({ voltPath, filePath }: ImageViewerProps) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const {
    zoom, dimensions, canvasRef, imgRef,
    handleImageLoad, zoomIn, zoomOut, zoomFit, zoomActual, resetZoom, zoomPercent,
  } = useImageZoom();
  const { dragging, handleMouseDown } = useImageDrag(canvasRef);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const dataUrl = await readImageBase64(voltPath, filePath);
        if (cancelled) return;
        const url = dataUrlToBlobUrl(dataUrl);
        revoke = url;
        setBlobUrl(url);
        resetZoom();
      } catch (e) {
        console.error('Failed to load image:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [voltPath, filePath, resetZoom]);

  const fileName = filePath.split('/').pop() ?? filePath;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.filename}>{fileName}</span>
        {dimensions && (
          <>
            <div className={styles.separator} />
            <span className={styles.dimensions}>{dimensions.w} x {dimensions.h}</span>
          </>
        )}
        <div className={styles.separator} />
        <button className={styles.toolbarBtn} onClick={zoomOut} title={t('image.zoomOut')}>
          <Icon name="zoomOut" size={16} />
        </button>
        <span className={styles.zoomLabel}>{zoomPercent}%</span>
        <button className={styles.toolbarBtn} onClick={zoomIn} title={t('image.zoomIn')}>
          <Icon name="zoomIn" size={16} />
        </button>
        <div className={styles.separator} />
        <button className={styles.toolbarBtn} onClick={zoomFit} title={t('image.fit')}>
          <Icon name="maximize" size={16} />
        </button>
        <button className={styles.toolbarBtn} onClick={zoomActual} title={t('image.actualSize')}>
          1:1
        </button>
      </div>
      <div
        ref={canvasRef}
        className={`${styles.canvas} ${dragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
      >
        {blobUrl && (
          <div className={styles.imageWrapper} style={{ transform: `scale(${zoom})` }}>
            <img
              ref={imgRef}
              src={blobUrl}
              className={styles.image}
              onLoad={handleImageLoad}
              alt={fileName}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
