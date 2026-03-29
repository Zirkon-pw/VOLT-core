import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { useTabStore, type FileTab } from '@app/stores/tabStore';
import { Sidebar } from '@widgets/sidebar/Sidebar';
import { FileTabs } from '@widgets/file-tabs/FileTabs';
import { FileViewHost } from '@widgets/file-view-host/FileViewHost';
import { PluginPageHost } from '@widgets/plugin-page/PluginPageHost';
import { SearchPopup } from '@widgets/search-popup/SearchPopup';
import { WorkspaceToolbar } from '@widgets/workspace-toolbar/WorkspaceToolbar';
import { loadAllPlugins, unloadAllPlugins } from '@app/plugins/pluginLoader';
import { useDoubleShift } from '../../hooks/useDoubleShift';
import { useKeyboardShortcuts } from '@app/hooks/useKeyboardShortcuts';
import styles from './WorkspacePage.module.scss';

export function WorkspacePage() {
  const { voltId } = useParams<{ voltId: string }>();
  const navigate = useNavigate();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeTabs = useTabStore((s) => s.activeTabs);
  const allTabs = useTabStore((s) => s.tabs);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('volt-sidebar-collapsed') === 'true');

  const workspace = workspaces.find((w) => w.voltId === voltId);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('volt-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ voltId: voltId ?? '', voltPath: workspace?.voltPath ?? '' });

  // Double-Shift to toggle search popup
  useDoubleShift(toggleSearch);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load plugins on workspace mount
  useEffect(() => {
    if (workspace) {
      loadAllPlugins(workspace.voltPath);
    }
    return () => {
      unloadAllPlugins();
    };
  }, [workspace]);

  useEffect(() => {
    if (voltId && workspace) {
      if (activeWorkspaceId !== voltId) {
        setActiveWorkspace(voltId);
      }
    } else if (!workspace && voltId) {
      // Workspace not found in store, navigate home
      navigate('/');
    }
  }, [voltId, workspace, activeWorkspaceId, setActiveWorkspace, navigate]);

  useEffect(() => {
    const handlePluginNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ voltId: string; pageId: string }>).detail;
      if (!detail || detail.voltId !== voltId) {
        return;
      }

      navigate(`/workspace/${detail.voltId}/plugin/${encodeURIComponent(detail.pageId)}`);
    };

    window.addEventListener('volt:navigate-plugin-page', handlePluginNavigation);
    return () => {
      window.removeEventListener('volt:navigate-plugin-page', handlePluginNavigation);
    };
  }, [navigate, voltId]);

  if (!workspace || !voltId) {
    return null;
  }

  const activeTabId = activeTabs[voltId] ?? null;
  const voltTabs: FileTab[] = allTabs[voltId] ?? [];
  const activeTab = voltTabs.find((t) => t.id === activeTabId) ?? null;

  const isPluginTab = activeTab?.type === 'plugin';
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : null;

  return (
    <div className={styles.layout}>
      <Sidebar
        voltId={voltId}
        voltPath={workspace.voltPath}
        onSearchClick={() => setSearchOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
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
              voltPath={workspace.voltPath}
              filePath={activeFilePath}
            />
          )}
        </div>
      </div>
      {searchOpen && (
        <SearchPopup
          isOpen={searchOpen}
          onClose={closeSearch}
          voltId={voltId}
          voltPath={workspace.voltPath}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
      )}
    </div>
  );
}
