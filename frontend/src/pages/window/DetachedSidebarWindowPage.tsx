import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '@plugins/file-tree/Sidebar';
import { readWindowPayloadFromSearch } from '@shared/lib/windowing';
import styles from './DetachedWindowPage.module.scss';

export function DetachedSidebarWindowPage() {
  const location = useLocation();
  const payload = useMemo(() => readWindowPayloadFromSearch(location.search), [location.search]);

  return (
    <div className={styles.root}>
      <div className={styles.surface}>
        {payload?.voltId && payload.voltPath ? (
          <Sidebar
            voltId={payload.voltId}
            voltPath={payload.voltPath}
            onSearchClick={() => undefined}
            collapsed={false}
            onToggleCollapse={() => undefined}
          />
        ) : (
          <div className={styles.message}>Detached sidebar window is missing a valid payload.</div>
        )}
      </div>
    </div>
  );
}
