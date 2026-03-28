import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { useFileTreeStore } from '@app/stores/fileTreeStore';
import { usePluginRegistryStore, type RegisteredSidebarPanel } from '@app/plugins/pluginRegistry';
import { safeExecute } from '@app/plugins/safeExecute';
import { FileTree } from '@widgets/file-tree/FileTree';
import { Icon } from '@uikit/icon';
import styles from './Sidebar.module.scss';

function PluginPanelSlot({ panel }: { panel: RegisteredSidebarPanel }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    safeExecute(panel.pluginId, `sidebarPanel:${panel.id}`, () => {
      panel.render(el);
    });

    return () => { el.innerHTML = ''; };
  }, [panel]);

  return (
    <div className={styles.pluginPanel}>
      <div className={styles.pluginPanelTitle}>{panel.title}</div>
      <div ref={containerRef} />
    </div>
  );
}

const STORAGE_KEY = 'volt-sidebar-width';
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

function getInitialWidth(): number {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const n = Number(saved);
    if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
  }
  return 240;
}

interface SidebarProps {
  voltId: string;
  voltPath: string;
  onSearchClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ voltId, voltPath, onSearchClick, collapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useI18n();
  const startCreate = useFileTreeStore((state) => state.startCreate);
  const notifyFsMutation = useFileTreeStore((state) => state.notifyFsMutation);
  const sidebarPanels = usePluginRegistryStore((s) => s.sidebarPanels);
  const sidebarButtons = usePluginRegistryStore((s) => s.sidebarButtons);
  const [width, setWidth] = useState(getInitialWidth);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(next);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  return (
    <aside className={collapsed ? styles.collapsed : styles.sidebar} style={!collapsed ? { width, minWidth: width } : undefined}>
      <div className={styles.topBar}>
        <button className={styles.iconButton} onClick={onSearchClick} title={t('sidebar.search')}>
          <Icon name="search" size={18} />
        </button>
        {collapsed ? (
          <>
            {sidebarButtons.map((button) => (
              <button
                key={button.id}
                className={styles.iconButton}
                onClick={button.callback}
                title={button.label}
                aria-label={button.label}
              >
                <Icon name={button.icon} size={18} />
              </button>
            ))}
          </>
        ) : (
          <>
            <button className={styles.iconButton} onClick={() => startCreate(voltId, '', false)} title={t('sidebar.newNote')}>
              <Icon name="plus" size={18} />
            </button>
            <button className={styles.iconButton} onClick={() => startCreate(voltId, '', true)} title={t('sidebar.newFolder')}>
              <Icon name="folder" size={18} />
            </button>
            <button className={styles.iconButton} onClick={() => void notifyFsMutation(voltId, voltPath)} title={t('sidebar.refreshFiles')}>
              <Icon name="refreshCw" size={18} />
            </button>
            {sidebarButtons.map((button) => (
              <button
                key={button.id}
                className={styles.iconButton}
                onClick={button.callback}
                title={button.label}
                aria-label={button.label}
              >
                <Icon name={button.icon} size={18} />
              </button>
            ))}
            <div className={styles.spacer} />
          </>
        )}
        <button className={styles.iconButton} onClick={onToggleCollapse} title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}>
          <Icon name="panelLeft" size={18} />
        </button>
      </div>
      {!collapsed && (
        <>
          <div className={styles.treeContainer}>
            <FileTree voltId={voltId} voltPath={voltPath} />
          </div>
          {sidebarPanels.length > 0 && (
            <div className={styles.pluginPanels}>
              {sidebarPanels.map((panel) => (
                <PluginPanelSlot key={panel.id} panel={panel} />
              ))}
            </div>
          )}
          <div className={styles.resizeHandle} onMouseDown={onMouseDown} />
        </>
      )}
    </aside>
  );
}
