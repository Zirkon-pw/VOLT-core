import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { Modal } from '@shared/ui/modal';
import { normalizeRemoteUrl } from '@shared/lib/remoteUrl';
import styles from './EmbedUrlPicker.module.scss';

interface EmbedUrlPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export function EmbedUrlPicker({ isOpen, onClose, onSubmit }: EmbedUrlPickerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setValue('');
    }
  }, [isOpen]);

  const normalizedUrl = useMemo(() => normalizeRemoteUrl(value), [value]);
  const showError = value.trim().length > 0 && normalizedUrl.length === 0;

  const submit = () => {
    if (!normalizedUrl) {
      return;
    }

    onSubmit(normalizedUrl);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('editor.embedPicker.title')}
    >
      <div className={styles.content} data-testid="embed-url-picker">
        <p className={styles.description}>{t('editor.embedPicker.description')}</p>
        <input
          autoFocus
          type="url"
          value={value}
          className={styles.input}
          data-testid="embed-url-input"
          placeholder={t('editor.embedPicker.placeholder')}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {showError && (
          <p className={styles.error}>{t('editor.embedPicker.invalid')}</p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            data-testid="embed-url-submit"
            onClick={submit}
            disabled={!normalizedUrl}
          >
            {t('editor.embedPicker.submit')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
