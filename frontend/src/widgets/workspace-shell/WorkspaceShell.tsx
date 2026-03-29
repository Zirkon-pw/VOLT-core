import { useCallback, useEffect, useState } from 'react';
import { useTabStore, type FileTab } from '@entities/tab';
import { SearchPopup } from '@features/workspace-search';
import { PluginPageHost } from '@widgets/plugin-page';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('volt-sidebar-collapsed') === 'true',
  );

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    localStorage.setItem('volt-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useWorkspaceHotkeys({
    voltId,
    onToggleSearch: toggleSearch,
    onToggleSidebar: toggleSidebar,
  });

  const activeTabId = activeTabs[voltId] ?? null;
  const voltTabs: FileTab[] = allTabs[voltId] ?? [];
  const activeTab = voltTabs.find((tab) => tab.id === activeTabId) ?? null;

  const isPluginTab = activeTab?.type === 'plugin';
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : null;

  return (
    <div className={styles.layout}>
      <Sidebar
        voltId={voltId}
        voltPath={voltPath}
        onSearchClick={() => setSearchOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className={styles.main}>
        <FileTabs voltId={voltId} />
        <WorkspaceToolbar />
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
        onClose={closeSearch}
        voltId={voltId}
        voltPath={voltPath}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
}
