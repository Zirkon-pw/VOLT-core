import { useMemo } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { usePluginTaskStatusStore } from './model/pluginTaskStatusStore';
import { Spinner } from '@shared/ui/spinner';
import styles from './PluginTaskStatusController.module.scss';

export function PluginTaskStatusController() {
  const { t } = useI18n();
  const allItems = usePluginTaskStatusStore((state) => state.items);
  const items = useMemo(
    () => allItems.filter((item) => item.surface === 'floating'),
    [allItems],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.card} ${styles[item.state]}`}
        >
          <div className={styles.header}>
            <div className={styles.titleRow}>
              {item.state === 'running' && <Spinner size="sm" />}
              <span className={styles.title}>{item.title}</span>
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
          {item.message && <div className={styles.message}>{item.message}</div>}
        </div>
      ))}
    </div>
  );
}
