import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BUILTIN_SHORTCUT_ACTIONS,
  useAppSettingsStore,
  useResolvedShortcuts,
  type ShortcutActionId,
} from '@entities/app-settings';
import {
  captureShortcutBinding,
  findShortcutConflict,
  formatShortcutBinding,
  type ShortcutDescriptor,
  type ShortcutGroup,
} from '@shared/lib/hotkeys';
import { useI18n } from '@app/providers/I18nProvider';
import styles from './ShortcutSettingsSection.module.scss';

const GROUP_ORDER: ShortcutGroup[] = ['app', 'editor', 'file-tree', 'plugins'];

function getGroupLabel(group: ShortcutGroup, t: (key: string) => string): string {
  switch (group) {
    case 'app':
      return t('settings.shortcuts.groups.app');
    case 'editor':
      return t('settings.shortcuts.groups.editor');
    case 'file-tree':
      return t('settings.shortcuts.groups.fileTree');
    case 'plugins':
      return t('settings.shortcuts.groups.plugins');
    default:
      return group;
  }
}

function getSourceLabel(source: 'built-in' | 'plugin' | 'override', t: (key: string) => string): string {
  switch (source) {
    case 'override':
      return t('settings.shortcuts.source.override');
    case 'plugin':
      return t('settings.shortcuts.source.plugin');
    default:
      return t('settings.shortcuts.source.builtin');
  }
}

function getShortcutLabel(descriptor: ShortcutDescriptor, t: (key: string) => string): string {
  return descriptor.labelKey ? t(descriptor.labelKey) : descriptor.label;
}

export function ShortcutSettingsSection() {
  const { t } = useI18n();
  const { descriptors, items, byActionId } = useResolvedShortcuts();
  const overrides = useAppSettingsStore((state) => state.settings.shortcutOverrides);
  const setShortcutOverride = useAppSettingsStore((state) => state.setShortcutOverride);
  const resetShortcutOverride = useAppSettingsStore((state) => state.resetShortcutOverride);
  const [query, setQuery] = useState('');
  const [capturingActionId, setCapturingActionId] = useState<ShortcutActionId | null>(null);
  const [errorByActionId, setErrorByActionId] = useState<Record<string, string>>({});
  const lastShiftTimestamp = useRef<number | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const label = getShortcutLabel(item.descriptor, t).toLowerCase();
      const subtitle = item.descriptor.subtitle?.toLowerCase() ?? '';
      const binding = formatShortcutBinding(item.binding).toLowerCase();
      return label.includes(normalizedQuery) || subtitle.includes(normalizedQuery) || binding.includes(normalizedQuery);
    });
  }, [items, query, t]);

  const groupedItems = useMemo(() => {
    return GROUP_ORDER.reduce<Record<ShortcutGroup, typeof filteredItems>>((acc, group) => {
      acc[group] = filteredItems.filter((item) => item.descriptor.group === group);
      return acc;
    }, {
      app: [],
      editor: [],
      'file-tree': [],
      plugins: [],
    });
  }, [filteredItems]);

  const saveBinding = useCallback((actionId: ShortcutActionId, binding: string) => {
    const descriptor = descriptors.find((item) => item.actionId === actionId);
    if (!descriptor) {
      return;
    }

    const conflict = findShortcutConflict(descriptors, overrides, actionId, binding);
    if (conflict) {
      setErrorByActionId((state) => ({
        ...state,
        [actionId]: t('settings.shortcuts.conflict', {
          name: getShortcutLabel(conflict.descriptor, t),
        }),
      }));
      return;
    }

    setErrorByActionId((state) => {
      if (!(actionId in state)) {
        return state;
      }

      const nextState = { ...state };
      delete nextState[actionId];
      return nextState;
    });

    if (binding === descriptor.defaultBinding) {
      resetShortcutOverride(actionId);
      return;
    }

    setShortcutOverride(actionId, binding);
  }, [descriptors, overrides, resetShortcutOverride, setShortcutOverride, t]);

  const handleCaptureKeyDown = useCallback((actionId: ShortcutActionId, event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const { binding, nextShiftTimestamp } = captureShortcutBinding(event.nativeEvent, lastShiftTimestamp.current);
    lastShiftTimestamp.current = nextShiftTimestamp;
    if (!binding) {
      return;
    }

    saveBinding(actionId, binding);
    setCapturingActionId(null);
    lastShiftTimestamp.current = null;
  }, [saveBinding]);

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('settings.shortcuts.title')}</h2>
        <p className={styles.description}>{t('settings.shortcuts.description')}</p>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('settings.shortcuts.searchPlaceholder')}
        />
      </div>

      {GROUP_ORDER.map((group) => {
        const groupItems = groupedItems[group];
        if (groupItems.length === 0) {
          return null;
        }

        return (
          <section key={group} className={styles.group}>
            <h3 className={styles.groupHeader}>{getGroupLabel(group, t)}</h3>
            {groupItems.map((item) => {
              const isCapturing = capturingActionId === item.actionId;
              const bindingLabel = isCapturing
                ? t('settings.shortcuts.captureHint')
                : formatShortcutBinding(item.binding) || t('settings.shortcuts.unbound');
              const sourceLabel = getSourceLabel(item.source, t);
              const hasOverride = item.source === 'override';
              const conflictLabel = item.conflictWith
                ? getShortcutLabel(byActionId[item.conflictWith]?.descriptor ?? item.descriptor, t)
                : null;

              return (
                <div key={item.actionId} className={styles.row}>
                  <div className={styles.meta}>
                    <div className={styles.label}>{getShortcutLabel(item.descriptor, t)}</div>
                    <div className={styles.subline}>
                      <span
                        className={`${styles.badge} ${hasOverride ? styles.badgeOverride : ''} ${
                          item.status === 'conflicted' ? styles.badgeConflict : ''
                        }`}
                      >
                        {sourceLabel}
                      </span>
                      {item.descriptor.subtitle ? <span>{item.descriptor.subtitle}</span> : null}
                      {item.actionId === BUILTIN_SHORTCUT_ACTIONS.workspaceSearchDoubleShift ? (
                        <span>{t('settings.shortcuts.doubleShiftNote')}</span>
                      ) : null}
                    </div>
                    {errorByActionId[item.actionId] ? (
                      <p className={`${styles.message} ${styles.errorText}`}>{errorByActionId[item.actionId]}</p>
                    ) : null}
                    {item.status === 'conflicted' && conflictLabel ? (
                      <p className={`${styles.message} ${styles.errorText}`}>
                        {t('settings.shortcuts.conflictedDefault', { name: conflictLabel })}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`${styles.bindingButton} ${isCapturing ? styles.bindingButtonActive : ''} ${
                      !item.binding ? styles.bindingButtonEmpty : ''
                    }`}
                    onClick={() => {
                      setCapturingActionId((current) => current === item.actionId ? null : item.actionId);
                      lastShiftTimestamp.current = null;
                    }}
                    onKeyDown={(event) => handleCaptureKeyDown(item.actionId, event)}
                  >
                    {bindingLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.resetButton}
                    disabled={overrides[item.actionId] == null}
                    onClick={() => {
                      resetShortcutOverride(item.actionId);
                      setErrorByActionId((state) => {
                        if (!(item.actionId in state)) {
                          return state;
                        }

                        const nextState = { ...state };
                        delete nextState[item.actionId];
                        return nextState;
                      });
                    }}
                  >
                    {t('settings.shortcuts.reset')}
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}

      {filteredItems.length === 0 ? (
        <div className={styles.empty}>{t('settings.shortcuts.empty')}</div>
      ) : null}
    </div>
  );
}
