import { useI18n } from '@app/providers/I18nProvider';
import { useTheme } from '@app/providers/ThemeProvider';
import { useAppSettingsStore } from '@plugins/settings/SettingsStore';
import styles from '../SettingsPage.module.scss';

export function GeneralSettings() {
  const { t, selectedLocale, availableLocales, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const imageDir = useAppSettingsStore((state) => state.settings.imageDir);
  const setImageDir = useAppSettingsStore((state) => state.setImageDir);

  const languageValue = (
    selectedLocale === 'auto' || availableLocales.some((locale) => locale.code === selectedLocale)
  ) ? selectedLocale : 'auto';

  return (
    <div className={styles.section}>
      <h2>{t('settings.section.localization')}</h2>
      <div className={styles.settingRow}>
        <label>{t('settings.language.label')}</label>
        <select
          value={languageValue}
          onChange={(event) => {
            void setLocale(event.target.value);
          }}
        >
          <option value="auto">{t('common.auto')}</option>
          {availableLocales.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {locale.label}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.helperText}>{t('settings.language.autoHint')}</p>

      <h2 className={styles.sectionTitle}>{t('settings.section.appearance')}</h2>
      <div className={styles.settingRow}>
        <label>{t('settings.theme')}</label>
        <select value={theme} onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}>
          <option value="light">{t('common.light')}</option>
          <option value="dark">{t('common.dark')}</option>
        </select>
      </div>

      <h2 className={styles.sectionTitle}>{t('settings.section.files')}</h2>
      <div className={styles.settingRow}>
        <label>{t('settings.imageDirectory')}</label>
        <input
          type="text"
          value={imageDir}
          onChange={(event) => {
            setImageDir(event.target.value);
          }}
          placeholder="attachments"
          className={styles.textInput}
        />
      </div>
      <p className={styles.helperText}>{t('settings.imageDirectoryHint')}</p>
    </div>
  );
}
