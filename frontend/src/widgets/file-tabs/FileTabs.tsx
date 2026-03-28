import { useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { useTabStore } from '@app/stores/tabStore';
import { Icon } from '@uikit/icon';
import styles from './FileTabs.module.scss';

interface FileTabsProps {
  voltId: string;
}

export function FileTabs({ voltId }: FileTabsProps) {
  const { t } = useI18n();
  const { tabs, activeTabs, setActiveTab, closeTab, reorderTabs } = useTabStore();
  const voltTabs = tabs[voltId] ?? [];
  const activeTabId = activeTabs[voltId] ?? null;

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (voltTabs.length === 0) return null;

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    // Middle click closes tab
    if (e.button === 1) {
      e.preventDefault();
      closeTab(voltId, tabId);
    }
  };

  return (
    <div className={styles.bar}>
      {voltTabs.map((tab, index) => {
        const tabLabel = tab.type === 'graph' ? t('sidebar.graph') : tab.fileName;

        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${dragIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
            onClick={() => setActiveTab(voltId, tab.id)}
            onMouseDown={(e) => handleMouseDown(e, tab.id)}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              setDragIndex(index);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                reorderTabs(voltId, dragIndex, index);
              }
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
          >
            <span className={styles.label}>
              {tab.isDirty && <span className={styles.dirty} />}
              {tabLabel}
            </span>
            <button
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(voltId, tab.id);
              }}
              aria-label={t('fileTabs.closeTab', { name: tabLabel })}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
