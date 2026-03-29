import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { useFileTreeStore } from '@entities/file-tree';
import { usePluginRegistryStore, type RegisteredSidebarPanel } from '@entities/plugin';
import { safeExecute } from '@shared/lib/plugin-runtime';
import { FileTree } from '../file-tree/FileTree';
import { Icon, type IconName } from '@shared/ui/icon';
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

  const builtInButtons: Array<{
    id: string;
    icon: IconName;
    title: string;
    onClick: () => void | Promise<void>;
  }> = [
    {
      id: 'search',
      icon: 'search',
      title: t('sidebar.search'),
      onClick: onSearchClick,
    },
    {
      id: 'new-note',
      icon: 'plus',
      title: t('sidebar.newNote'),
      onClick: () => startCreate(voltId, '', false),
    },
    {
      id: 'new-folder',
      icon: 'folder',
      title: t('sidebar.newFolder'),
      onClick: () => startCreate(voltId, '', true),
    },
    {
      id: 'refresh-files',
      icon: 'refreshCw',
      title: t('sidebar.refreshFiles'),
      onClick: () => void notifyFsMutation(voltId, voltPath),
    },
  ];

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
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.rail}>
        <div className={styles.railActions}>
          {builtInButtons.map((button) => (
            <button
              key={button.id}
              className={styles.iconButton}
              onClick={button.onClick}
              title={button.title}
              aria-label={button.title}
            >
              <Icon name={button.icon} size={18} />
            </button>
          ))}
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
        </div>
      </div>
      {!collapsed && (
        <div className={styles.pane} style={{ width, minWidth: width }}>
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
        </div>
      )}
      <button
        className={styles.toggleButton}
        onClick={onToggleCollapse}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
      >
        <Icon
          name="chevronRight"
          size={16}
          className={collapsed ? styles.toggleIconCollapsed : styles.toggleIconExpanded}
        />
      </button>
    </aside>
  );
}
