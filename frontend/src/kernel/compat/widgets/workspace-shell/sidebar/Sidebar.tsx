import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import { useFileTreeStore } from '@plugins/file-tree';
import { usePluginRegistryStore, type RegisteredSidebarPanel } from '@entities/plugin';
import { SIDEBAR } from '@shared/config/constants';
import { safeExecute } from '@shared/lib/plugin-runtime';
import { FileTree } from '../file-tree/FileTree';
import { Icon, type IconSource } from '@shared/ui/icon';
import { useSidebarButtonOrder } from './hooks/useSidebarButtonOrder';
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

function getInitialWidth(): number {
  const saved = localStorage.getItem(SIDEBAR.STORAGE_KEY);
  if (saved) {
    const n = Number(saved);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return SIDEBAR.DEFAULT_WIDTH;
}

interface SidebarProps {
  voltId: string;
  voltPath: string;
  onSearchClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SidebarButtonItem {
  id: string;
  icon: IconSource;
  title: string;
  onClick: () => void | Promise<void>;
}

export function Sidebar({ voltId, voltPath, onSearchClick, collapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useI18n();
  const startCreate = useFileTreeStore((state) => state.startCreate);
  const sidebarPanels = usePluginRegistryStore((s) => s.sidebarPanels);
  const sidebarButtons = usePluginRegistryStore((s) => s.sidebarButtons);
  const [width, setWidth] = useState(getInitialWidth);
  const dragging = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const builtInButtons = useMemo<SidebarButtonItem[]>(() => ([
    {
      id: 'builtin:search',
      icon: 'search',
      title: t('sidebar.search'),
      onClick: onSearchClick,
    },
    {
      id: 'builtin:new-note',
      icon: 'fileText',
      title: t('sidebar.newNote'),
      onClick: () => startCreate(voltId, '', false),
    },
    {
      id: 'builtin:new-folder',
      icon: 'folder',
      title: t('sidebar.newFolder'),
      onClick: () => startCreate(voltId, '', true),
    },
  ]), [onSearchClick, startCreate, t, voltId]);

  const pluginButtons = useMemo<SidebarButtonItem[]>(() => (
    sidebarButtons.map((button) => ({
      id: `plugin:${button.pluginId}:${button.id}`,
      icon: button.icon,
      title: button.label,
      onClick: button.callback,
    }))
  ), [sidebarButtons]);

  const [orderedButtons, dragHandlers] = useSidebarButtonOrder([...builtInButtons, ...pluginButtons]);

  const startResize = useCallback((clientX: number) => {
    const sidebarEl = sidebarRef.current;
    const railEl = railRef.current;
    if (!sidebarEl || !railEl) {
      return;
    }

    const sidebarRect = sidebarEl.getBoundingClientRect();
    const railRect = railEl.getBoundingClientRect();
    const computed = window.getComputedStyle(sidebarEl);
    const gap = Number.parseFloat(computed.gap || '0') || 0;
    const paddingLeft = Number.parseFloat(computed.paddingLeft || '0') || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight || '0') || 0;
    const fixedWidth = railRect.width + gap + paddingLeft + paddingRight;
    const next = clientX - sidebarRect.left - fixedWidth;
    const parentRect = sidebarEl.parentElement?.getBoundingClientRect();
    const availableWidth = Math.max(
      fixedWidth,
      (parentRect?.right ?? window.innerWidth) - sidebarRect.left - fixedWidth,
    );
    const minPaneWidth = Math.max(180, Math.round(availableWidth * 0.18));
    const minMainWidth = Math.max(320, Math.round(availableWidth * 0.32));
    const maxPaneWidth = Math.max(minPaneWidth, availableWidth - minMainWidth);
    const clamped = Math.min(maxPaneWidth, Math.max(minPaneWidth, next));

    setWidth(clamped);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    dragging.current = true;
    startResize(e.clientX);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [collapsed, startResize]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      startResize(e.clientX);
    };

    const onPointerUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [startResize]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR.STORAGE_KEY, String(width));
  }, [width]);

  return (
    <aside ref={sidebarRef} className={styles.sidebar}>
      <div className={styles.surface}>
        <div ref={railRef} className={styles.rail}>
          <div className={styles.railActions}>
            {orderedButtons.map((button) => {
              const isDragging = dragHandlers.draggedId === button.id;
              const isDragOver = dragHandlers.overId === button.id && dragHandlers.draggedId !== button.id;

              return (
                <button
                  key={button.id}
                  type="button"
                  data-button-id={button.id}
                  className={[
                    styles.iconButton,
                    isDragging ? styles.iconButtonDragging : '',
                    isDragOver ? styles.iconButtonDragOver : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => { void button.onClick(); }}
                  title={button.title}
                  aria-label={button.title}
                  aria-grabbed={isDragging}
                  draggable={true}
                  onDragStart={(event) => dragHandlers.handleDragStart(event, button.id)}
                  onDragEnd={dragHandlers.handleDragEnd}
                  onDragOver={(event) => dragHandlers.handleDragOver(event, button.id)}
                  onDragLeave={(event) => dragHandlers.handleDragLeave(event, button.id)}
                  onDrop={(event) => dragHandlers.handleDrop(event, button.id)}
                >
                  <Icon name={button.icon} size={18} />
                </button>
              );
            })}
          </div>
        </div>
        {!collapsed && (
          <div className={styles.pane} style={{ width, minWidth: width }} data-testid="sidebar-pane">
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
          </div>
        )}
      </div>
      <div
        className={`${styles.resizeHandle} ${collapsed ? styles.resizeHandleCollapsed : ''}`}
        data-testid="sidebar-resize-seam"
      >
        {!collapsed ? (
          <div
            className={styles.resizeTrack}
            onPointerDown={onPointerDown}
            aria-hidden="true"
          />
        ) : null}
        <button
          type="button"
          className={styles.toggleButton}
          data-testid="sidebar-toggle"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse();
          }}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <Icon
            name="chevronRight"
            size={16}
            className={collapsed ? styles.toggleIconCollapsed : styles.toggleIconExpanded}
          />
        </button>
      </div>
    </aside>
  );
}
