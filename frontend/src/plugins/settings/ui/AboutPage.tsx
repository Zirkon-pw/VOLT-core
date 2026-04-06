import { useI18n } from '@app/providers/I18nProvider';
import styles from '../SettingsPage.module.scss';

export function AboutPage() {
  const { t } = useI18n();

  return (
    <div className={styles.section}>
      <h2>{t('settings.about.title')}</h2>
      <p>{t('settings.about.version')}</p>
      <p className={styles.sectionDescription}>{t('settings.about.description')}</p>
    </div>
  );
}
