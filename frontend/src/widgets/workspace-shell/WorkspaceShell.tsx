import { useCallback, useEffect, useState } from 'react';
import { useTabStore, type FileTab } from '@entities/tab';
import { useNavigationStore } from '@entities/navigation';
import { SearchPopup } from '@features/workspace-search';
import { PluginPageHost } from '@widgets/plugin-page';
import { SIDEBAR } from '@shared/config/constants';
import { Breadcrumbs } from './breadcrumbs/Breadcrumbs';
import { FileTabs } from './file-tabs/FileTabs';
import { FileViewHost } from './file-view-host/FileViewHost';
import { Sidebar } from './sidebar/Sidebar';
import { WorkspaceToolbar } from './workspace-toolbar/WorkspaceToolbar';
import { useWorkspaceHotkeys } from './model/useWorkspaceHotkeys';
import styles from './WorkspaceShell.module.scss';

interface WorkspaceShellProps {
  voltId: string;
  voltPath: string;
}

export function WorkspaceShell({ voltId, voltPath }: WorkspaceShellProps) {
  const activeTabs = useTabStore((state) => state.activeTabs);
  const allTabs = useTabStore((state) => state.tabs);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchOpenToken, setSearchOpenToken] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR.COLLAPSED_STORAGE_KEY) === 'true',
  );

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

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  const activeTabId = activeTabs[voltId] ?? null;
  const voltTabs: FileTab[] = allTabs[voltId] ?? [];
  const activeTab = voltTabs.find((tab) => tab.id === activeTabId) ?? null;

  const isPluginTab = activeTab?.type === 'plugin';
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : null;

  const pushNavigation = useNavigationStore((state) => state.push);

  useEffect(() => {
    if (activeFilePath) {
      pushNavigation(voltId, activeFilePath);
    }
  }, [activeFilePath, voltId, pushNavigation]);

  return (
    <div className={styles.layout}>
      <Sidebar
        voltId={voltId}
        voltPath={voltPath}
        onSearchClick={() => openSearch('')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className={styles.main}>
        <FileTabs voltId={voltId} />
        <WorkspaceToolbar />
        <Breadcrumbs voltId={voltId} />
        <div className={styles.content}>
          {isPluginTab ? (
            <PluginPageHost
              pageId={activeTab?.pluginPageId ?? ''}
              className={styles.pluginPage}
            />
          ) : (
            <FileViewHost
              voltId={voltId}
              voltPath={voltPath}
              filePath={activeFilePath}
            />
          )}
        </div>
      </div>
      <SearchPopup
        isOpen={searchOpen}
        initialQuery={searchInitialQuery}
        openToken={searchOpenToken}
        onClose={closeSearch}
        voltId={voltId}
        voltPath={voltPath}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
}
