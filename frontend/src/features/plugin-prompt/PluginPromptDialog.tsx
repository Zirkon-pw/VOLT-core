import { useEffect, useState } from 'react';
import { Modal } from '@shared/ui/modal';
import { useI18n } from '@app/providers/I18nProvider';
import { resolvePluginPrompt, usePluginPromptStore } from './model/pluginPromptStore';
import styles from './PluginPromptDialog.module.scss';

export function PluginPromptDialog() {
  const { t } = useI18n();
  const request = usePluginPromptStore((state) => state.request);
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(request?.initialValue ?? '');
  }, [request]);

  if (!request) {
    return null;
  }

  const normalizedValue = value.trim();
  const submitLabel = request.submitLabel || t('pluginPrompt.submit');

  return (
    <Modal
      isOpen={request != null}
      onClose={() => resolvePluginPrompt(null)}
      title={request.title}
    >
      <div className={styles.content}>
        {request.description && (
          <p className={styles.description}>{request.description}</p>
        )}
        {request.multiline ? (
          <textarea
            className={styles.textarea}
            placeholder={request.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        ) : (
          <input
            className={styles.input}
            placeholder={request.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => resolvePluginPrompt(null)}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => resolvePluginPrompt(normalizedValue)}
            disabled={normalizedValue.length === 0}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
