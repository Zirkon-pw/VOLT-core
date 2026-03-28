import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@app/providers/I18nProvider';
import { useTheme } from '@app/providers/ThemeProvider';
import { Icon } from '@uikit/icon';
import styles from './SettingsPage.module.scss';

const IMAGE_DIR_KEY = 'volt-image-dir';

type SettingsTab = 'general' | 'plugins' | 'about';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, selectedLocale, availableLocales, setLocale, refreshLocalization } = useI18n();
  const [imageDir, setImageDir] = useState(() => localStorage.getItem(IMAGE_DIR_KEY) || 'attachments');

  useEffect(() => {
    void refreshLocalization().catch(() => undefined);
  }, [refreshLocalization]);

  const languageValue = (
    selectedLocale === 'auto' || availableLocales.some((locale) => locale.code === selectedLocale)
  ) ? selectedLocale : 'auto';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> {t('common.back')}
        </button>
        <h1>{t('settings.title')}</h1>
      </div>
      <div className={styles.layout}>
        <nav className={styles.tabs}>
          <button className={activeTab === 'general' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('general')}>{t('settings.tab.general')}</button>
          <button className={activeTab === 'plugins' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('plugins')}>{t('settings.tab.plugins')}</button>
          <button className={activeTab === 'about' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('about')}>{t('settings.tab.about')}</button>
        </nav>
        <div className={styles.content}>
          {activeTab === 'general' && (
            <div className={styles.section}>
              <h2>{t('settings.section.localization')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.language.label')}</label>
                <select
                  value={languageValue}
                  onChange={(e) => {
                    void setLocale(e.target.value);
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
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {t('settings.language.autoHint')}
              </p>

              <h2 style={{ marginTop: 'var(--space-4)' }}>{t('settings.section.appearance')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.theme')}</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
                  <option value="light">{t('common.light')}</option>
                  <option value="dark">{t('common.dark')}</option>
                </select>
              </div>
              <h2 style={{ marginTop: 'var(--space-4)' }}>{t('settings.section.files')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.imageDirectory')}</label>
                <input
                  type="text"
                  value={imageDir}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageDir(val);
                    localStorage.setItem(IMAGE_DIR_KEY, val);
                  }}
                  placeholder="attachments"
                  className={styles.textInput}
                />
              </div>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {t('settings.imageDirectoryHint')}
              </p>
            </div>
          )}
          {activeTab === 'plugins' && (
            <div className={styles.section}>
              <h2>{t('settings.plugins.title')}</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>{t('settings.plugins.description')}</p>
            </div>
          )}
          {activeTab === 'about' && (
            <div className={styles.section}>
              <h2>{t('settings.about.title')}</h2>
              <p>{t('settings.about.version')}</p>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{t('settings.about.description')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
