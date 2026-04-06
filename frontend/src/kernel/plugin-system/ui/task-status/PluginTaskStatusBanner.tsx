import { useMemo } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { usePluginTaskStatusStore } from './model/pluginTaskStatusStore';
import { Spinner } from '@shared/ui/spinner';
import styles from './PluginTaskStatusBanner.module.scss';

interface PluginTaskStatusBannerProps {
  voltPath: string;
  filePath: string;
}

export function PluginTaskStatusBanner({
  voltPath,
  filePath,
}: PluginTaskStatusBannerProps) {
  const { t } = useI18n();
  const items = usePluginTaskStatusStore((state) => state.items);

  const visibleItems = useMemo(
    () => items.filter((item) => {
      if (item.surface !== 'workspace-banner') {
        return false;
      }

      if (item.scope === 'workspace') {
        return item.sourceVoltPath === voltPath;
      }

      return item.sourceVoltPath === voltPath && item.sourceFilePath === filePath;
    }),
    [filePath, items, voltPath],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={styles.stack}>
      {visibleItems.map((item) => (
        <div
          key={item.id}
          className={`${styles.banner} ${styles[item.state]}`}
        >
          <div className={styles.main}>
            {item.state === 'running' && <Spinner size="sm" />}
            <div className={styles.copy}>
              <div className={styles.title}>{item.title}</div>
              {item.message && <div className={styles.message}>{item.message}</div>}
            </div>
          </div>
          {item.state === 'running' && item.cancellable && item.onCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                void item.onCancel?.();
              }}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
