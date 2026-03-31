import type { PluginInfo } from '@shared/api/plugin';
import { useI18n } from '@app/providers/I18nProvider';
import { Modal } from '@shared/ui/modal';
import styles from './PermissionDialog.module.scss';

interface PermissionDialogProps {
  isOpen: boolean;
  plugin: PluginInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const permissionKeyMap: Record<string, { label: string; description: string }> = {
  read: {
    label: 'settings.plugins.permissions.read.label',
    description: 'settings.plugins.permissions.read.description',
  },
  write: {
    label: 'settings.plugins.permissions.write.label',
    description: 'settings.plugins.permissions.write.description',
  },
  editor: {
    label: 'settings.plugins.permissions.editor.label',
    description: 'settings.plugins.permissions.editor.description',
  },
  process: {
    label: 'settings.plugins.permissions.process.label',
    description: 'settings.plugins.permissions.process.description',
  },
  external: {
    label: 'settings.plugins.permissions.external.label',
    description: 'settings.plugins.permissions.external.description',
  },
};

export function PermissionDialog({
  isOpen,
  plugin,
  onConfirm,
  onCancel,
}: PermissionDialogProps) {
  const { t } = useI18n();

  if (!plugin) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('settings.plugins.permissions.title', { name: plugin.manifest.name })}
    >
      <div className={styles.content}>
        <p className={styles.description}>
          {t('settings.plugins.permissions.description')}
        </p>
        <div className={styles.permissionList}>
          {plugin.manifest.permissions.map((permission) => {
            const keys = permissionKeyMap[permission];
            return (
              <div key={permission} className={styles.permissionItem}>
                <div className={styles.permissionLabel}>
                  {keys ? t(keys.label) : permission}
                </div>
                <div className={styles.permissionDescription}>
                  {keys ? t(keys.description) : permission}
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className={styles.primaryButton} onClick={onConfirm}>
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
