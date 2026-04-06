import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FileViewHost } from '@plugins/file-viewer/FileViewHost';
import { readWindowPayloadFromSearch } from '@shared/lib/windowing';
import styles from './DetachedWindowPage.module.scss';

export function DetachedFileWindowPage() {
  const location = useLocation();
  const payload = useMemo(() => readWindowPayloadFromSearch(location.search), [location.search]);

  return (
    <div className={styles.root}>
      <div className={styles.surface}>
        {payload?.voltId && payload.voltPath && payload.filePath ? (
          <FileViewHost
            voltId={payload.voltId}
            voltPath={payload.voltPath}
            filePath={payload.filePath}
          />
        ) : (
          <div className={styles.message}>Detached file window is missing a valid payload.</div>
        )}
      </div>
    </div>
  );
}
