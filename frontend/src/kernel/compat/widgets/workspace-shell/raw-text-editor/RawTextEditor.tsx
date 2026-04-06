import { useCallback, useRef, useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { useFileSession } from '@shared/lib/hooks/useFileSession';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import styles from './RawTextEditor.module.scss';

interface RawTextEditorProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

export function RawTextEditor({ voltId, voltPath, filePath }: RawTextEditorProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const valueRef = useRef(value);
  valueRef.current = value;

  const { markDirtyAndAutoSave } = useFileSession({
    voltId,
    voltPath,
    filePath,
    getContent: useCallback(() => valueRef.current, []),
    setContent: setValue,
    onClear: useCallback(() => setValue(''), []),
  });

  const handleChange = useCallback((nextValue: string) => {
    setValue(nextValue);
    markDirtyAndAutoSave();
  }, [markDirtyAndAutoSave]);

  if (!filePath) {
    return (
      <div className={styles.panel}>
        <span>{t('editor.empty')}</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />
      <textarea
        key={filePath}
        className={styles.editor}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
