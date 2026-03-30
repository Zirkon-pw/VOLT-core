import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@app/providers/I18nProvider';
import { useWorkspaceStore } from '@entities/workspace';
import { Icon } from '@shared/ui/icon';
import styles from './WorkspaceTabs.module.scss';

export function WorkspaceTabs() {
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, closeWorkspace, reorderWorkspaces } =
    useWorkspaceStore();
  const navigate = useNavigate();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleClick = (voltId: string) => {
    setActiveWorkspace(voltId);
    navigate(`/workspace/${voltId}`);
  };

  const handleClose = (e: React.MouseEvent, voltId: string) => {
    e.stopPropagation();
    closeWorkspace(voltId);
    const remaining = workspaces.filter((w) => w.voltId !== voltId);
    if (remaining.length === 0) {
      navigate('/');
    } else if (activeWorkspaceId === voltId) {
      const last = remaining[remaining.length - 1];
      navigate(`/workspace/${last.voltId}`);
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.headerButtons}>
        <button className={styles.headerBtn} onClick={() => navigate('/')} title={t('workspaceTabs.home')}>
          <Icon name="home" size={16} />
        </button>
        <button className={styles.headerBtn} onClick={() => navigate('/settings')} title={t('workspaceTabs.settings')}>
          <Icon name="settings" size={16} />
        </button>
        <div className={styles.separator} />
      </div>
      {workspaces.map((ws, index) => (
        <div
          key={ws.voltId}
          className={`${styles.tab} ${ws.voltId === activeWorkspaceId ? styles.active : ''} ${dragIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
          onClick={() => handleClick(ws.voltId)}
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
              reorderWorkspaces(dragIndex, index);
            }
            setDragIndex(null);
            setDragOverIndex(null);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setDragOverIndex(null);
          }}
        >
          <span className={styles.label}>{ws.voltName}</span>
          <button
            className={styles.closeBtn}
            onClick={(e) => handleClose(e, ws.voltId)}
            aria-label={t('workspaceTabs.closeWorkspace', { name: ws.voltName })}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
