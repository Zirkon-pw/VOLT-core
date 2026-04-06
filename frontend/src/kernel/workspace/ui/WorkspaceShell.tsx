import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabStore, type FileTab } from '@kernel/workspace/tabs/model';
import { useNavigationStore } from '@kernel/navigation/model';
import { type PaneId, useWorkspaceViewStore } from '@kernel/workspace/panes/model';
import { usePluginRegistryStore } from '@kernel/plugin-system/model/pluginRegistry';
import { useWorkspaceSlotRegistry } from '@kernel/services/workspaceSlotRegistry';
import { Icon } from '@shared/ui/icon';
import { PluginPageHost } from '@kernel/plugin-system/ui/plugin-page';
import { SIDEBAR } from '@shared/config/constants';
import { FileTabs } from '../tabs/file-tabs/FileTabs';
import { WorkspaceToolbar } from './workspace-toolbar/WorkspaceToolbar';
import { useWorkspaceHotkeys } from './useWorkspaceHotkeys';
import styles from './WorkspaceShell.module.scss';

interface WorkspaceShellProps {
  voltId: string;
  voltPath: string;
}

const EMPTY_TABS: FileTab[] = [];

export function WorkspaceShell({ voltId, voltPath }: WorkspaceShellProps) {
  const activeTabId = useTabStore((state) => state.activeTabs[voltId] ?? null);
  const voltTabs = useTabStore((state) => state.tabs[voltId] ?? EMPTY_TABS);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const workspaceView = useWorkspaceViewStore((state) => state.views[voltId]);
  const setActivePane = useWorkspaceViewStore((state) => state.setActivePane);
  const setSplitRatio = useWorkspaceViewStore((state) => state.setSplitRatio);
  const closeSecondary = useWorkspaceViewStore((state) => state.closeSecondary);
  const syncTabs = useWorkspaceViewStore((state) => state.syncTabs);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchOpenToken, setSearchOpenToken] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR.COLLAPSED_STORAGE_KEY) === 'true',
  );
  const hasToolbarButtons = usePluginRegistryStore((state) => state.toolbarButtons.length > 0);
  const slots = useWorkspaceSlotRegistry((state) => state.slots);
  const SidebarSlot = slots['sidebar'];
  const BreadcrumbsSlot = slots['breadcrumbs'];
  const FileViewHostSlot = slots['file-view-host'];
  const SearchPopupSlot = slots['search-popup'];
  const contentRef = useRef<HTMLDivElement>(null);
  const splitDraggingRef = useRef(false);

  const openSearch = useCallback((initialQuery = '') => {
    setSearchInitialQuery(initialQuery);
    setSearchOpenToken((current) => current + 1);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const openFindInFile = useCallback(() => {
    window.dispatchEvent(new CustomEvent('volt:find-in-file'));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR.COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useWorkspaceHotkeys({
    voltId,
    onOpenSearch: openSearch,
    onToggleSidebar: toggleSidebar,
    onOpenFindInFile: openFindInFile,
  });

  const activeTab = voltTabs.find((tab) => tab.id === activeTabId) ?? null;
  const primaryTab = voltTabs.find((tab) => tab.id === workspaceView?.primaryTabId) ?? activeTab ?? null;
  const secondaryTab = voltTabs.find((tab) => tab.id === workspaceView?.secondaryTabId) ?? null;
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : null;
  const hasChromeStack = voltTabs.length > 0 || hasToolbarButtons || Boolean(primaryTab?.filePath);
  const splitRatio = workspaceView?.splitRatio ?? 0.5;
  const hasSecondaryPane = Boolean(secondaryTab);

  const pushNavigation = useNavigationStore((state) => state.push);

  useEffect(() => {
    syncTabs(voltId, voltTabs, activeTabId);
  }, [activeTabId, syncTabs, voltId, voltTabs]);

  useEffect(() => {
    if (activeFilePath) {
      pushNavigation(voltId, activeFilePath);
    }
  }, [activeFilePath, voltId, pushNavigation]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!splitDraggingRef.current) {
        return;
      }

      const content = contentRef.current;
      if (!content) {
        return;
      }

      const rect = content.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const nextRatio = (event.clientX - rect.left) / rect.width;
      setSplitRatio(voltId, nextRatio);
    };

    const handleMouseUp = () => {
      if (!splitDraggingRef.current) {
        return;
      }

      splitDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSplitRatio, voltId]);

  const focusPane = useCallback((paneId: PaneId, tab: FileTab | null) => {
    setActivePane(voltId, paneId);
    if (tab) {
      setActiveTab(voltId, tab.id);
    }
  }, [setActivePane, setActiveTab, voltId]);

  const startSplitResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    splitDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const renderTabSurface = useCallback((tab: FileTab | null) => {
    if (!tab) {
      return (
        <div className={styles.emptyPane}>
          <span className={styles.emptyPaneText}>Open a file to start working.</span>
        </div>
      );
    }

    if (tab.type === 'plugin') {
      return (
        <PluginPageHost
          pageId={tab.pluginPageId ?? ''}
          className={styles.pluginPage}
        />
      );
    }

    return FileViewHostSlot ? (
      <FileViewHostSlot
        voltId={voltId}
        voltPath={voltPath}
        filePath={tab.filePath}
      />
    ) : null;
  }, [voltId, voltPath, FileViewHostSlot]);

  return (
    <div className={styles.layout}>
      {SidebarSlot ? (
        <SidebarSlot
          voltId={voltId}
          voltPath={voltPath}
          onSearchClick={() => openSearch('')}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      ) : null}
      <div className={styles.main}>
        {hasChromeStack ? (
          <div className={styles.chromeStack}>
            <FileTabs voltId={voltId} />
            <WorkspaceToolbar />
          </div>
        ) : null}
        <div ref={contentRef} className={styles.content}>
          <div className={styles.breadcrumbsOverlay}>
            {BreadcrumbsSlot ? <BreadcrumbsSlot voltId={voltId} /> : null}
          </div>
          <div className={styles.paneLayout}>
            <div
              className={[
                styles.workspacePane,
                workspaceView?.activePane === 'primary' ? styles.workspacePaneActive : '',
              ].filter(Boolean).join(' ')}
              style={hasSecondaryPane ? { flexBasis: `${splitRatio * 100}%` } : undefined}
              onMouseDownCapture={() => focusPane('primary', primaryTab)}
              data-pane-id="primary"
              data-tab-id={primaryTab?.id ?? ''}
              data-testid="workspace-pane-primary"
            >
              {renderTabSurface(primaryTab)}
            </div>
            {hasSecondaryPane ? (
              <>
                <div
                  className={styles.splitSeam}
                  onMouseDown={startSplitResize}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize workspace panes"
                  data-testid="workspace-split-seam"
                >
                  <button
                    type="button"
                    className={styles.secondaryClose}
                    data-testid="workspace-secondary-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeSecondary(voltId);
                      if (primaryTab) {
                        setActiveTab(voltId, primaryTab.id);
                      }
                    }}
                    aria-label="Close secondary pane"
                    title="Close secondary pane"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
                <div
                  className={[
                    styles.workspacePane,
                    workspaceView?.activePane === 'secondary' ? styles.workspacePaneActive : '',
                  ].filter(Boolean).join(' ')}
                  style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
                  onMouseDownCapture={() => focusPane('secondary', secondaryTab)}
                  data-pane-id="secondary"
                  data-tab-id={secondaryTab?.id ?? ''}
                  data-testid="workspace-pane-secondary"
                >
                  {renderTabSurface(secondaryTab)}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {SearchPopupSlot ? (
        <SearchPopupSlot
          isOpen={searchOpen}
          initialQuery={searchInitialQuery}
          openToken={searchOpenToken}
          onClose={closeSearch}
          voltId={voltId}
          voltPath={voltPath}
          onToggleSidebar={toggleSidebar}
        />
      ) : null}
    </div>
  );
}
