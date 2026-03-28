import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPlugins, setPluginEnabled } from '@api/plugin';
import type { PluginInfo } from '@api/plugin';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@uikit/icon';
import styles from './PluginSettingsPage.module.scss';

export function PluginSettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = useCallback(async () => {
    try {
      const list = await listPlugins();
      setPlugins(list);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleToggle = useCallback(
    async (pluginId: string, currentEnabled: boolean) => {
      try {
        await setPluginEnabled(pluginId, !currentEnabled);
        setPlugins((prev) =>
          prev.map((p) =>
            p.manifest.id === pluginId ? { ...p, enabled: !currentEnabled } : p,
          ),
        );
      } catch (err) {
        console.error('Failed to toggle plugin:', err);
      }
    },
    [],
  );

  return (
    <div className={styles.root}>
      <span
        className={styles.backLink}
        onClick={() => navigate(-1)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate(-1);
        }}
      >
        <Icon name="arrowLeft" size={14} /> {t('common.back')}
      </span>
      <h1 className={styles.title}>{t('plugins.title')}</h1>
      <p className={styles.subtitle}>{t('plugins.subtitle')}</p>

      {loading ? null : plugins.length === 0 ? (
        <div className={styles.empty}>
          {t('plugins.empty')}
        </div>
      ) : (
        <div className={styles.list}>
          {plugins.map((p) => (
            <div key={p.manifest.id} className={styles.pluginItem}>
              <div className={styles.pluginInfo}>
                <div className={styles.pluginName}>
                  {p.manifest.name}
                  <span className={styles.pluginVersion}>v{p.manifest.version}</span>
                </div>
                {p.manifest.description && (
                  <div className={styles.pluginDescription}>
                    {p.manifest.description}
                  </div>
                )}
              </div>
              <button
                className={`${styles.toggle} ${p.enabled ? styles.toggleOn : ''}`}
                onClick={() => handleToggle(p.manifest.id, p.enabled)}
                aria-label={t(
                  p.enabled ? 'plugins.toggle.disable' : 'plugins.toggle.enable',
                  { name: p.manifest.name },
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
