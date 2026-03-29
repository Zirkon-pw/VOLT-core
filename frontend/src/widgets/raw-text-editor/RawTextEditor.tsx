import { useCallback, useEffect, useRef, useState } from 'react';
import { readNote, saveNote } from '@api/note';
import { emit } from '@app/plugins/pluginEventBus';
import { useI18n } from '@app/providers/I18nProvider';
import { useActiveFileStore } from '@app/stores/activeFileStore';
import { useTabStore } from '@app/stores/tabStore';
import { PluginTaskStatusBanner } from '@widgets/plugin-task-status/PluginTaskStatusBanner';
import styles from './RawTextEditor.module.scss';

interface RawTextEditorProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

export function RawTextEditor({ voltId, voltPath, filePath }: RawTextEditorProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const loadedPathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setDirty = useTabStore((state) => state.setDirty);
  const pendingRename = useTabStore((state) => state.pendingRenames[voltId] ?? null);
  const consumePendingRename = useTabStore((state) => state.consumePendingRename);
  const registerSaveHandler = useActiveFileStore((state) => state.registerSaveHandler);

  const save = useCallback(async () => {
    if (!filePath) {
      return;
    }

    try {
      await saveNote(voltPath, filePath, value);
      setDirty(voltId, filePath, false);
      emit('file-save', filePath);
    } catch (error) {
      console.error('Failed to save text file:', error);
    }
  }, [filePath, setDirty, value, voltId, voltPath]);

  useEffect(() => {
    if (!filePath) {
      loadedPathRef.current = null;
      setValue('');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const isRenameTransition = pendingRename?.newPath === filePath && loadedPathRef.current === pendingRename.oldPath;
        if (isRenameTransition) {
          loadedPathRef.current = filePath;
          consumePendingRename(voltId, filePath);
          return;
        }

        const content = await readNote(voltPath, filePath);
        if (cancelled) {
          return;
        }

        setValue(content);
        loadedPathRef.current = filePath;
        setDirty(voltId, filePath, false);
        emit('file-open', filePath);
      } catch (error) {
        console.error('Failed to load text file:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consumePendingRename, filePath, pendingRename, setDirty, voltId, voltPath]);

  useEffect(() => {
    if (!filePath) {
      return;
    }

    return registerSaveHandler(voltId, filePath, save);
  }, [filePath, registerSaveHandler, save, voltId]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleChange = useCallback((nextValue: string) => {
    if (!filePath) {
      return;
    }

    setValue(nextValue);
    setDirty(voltId, filePath, true);
    emit('editor-change');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void save();
    }, 500);
  }, [filePath, save, setDirty, voltId]);

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
        className={styles.editor}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
