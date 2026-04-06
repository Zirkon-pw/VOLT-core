import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { HomePage } from '@pages/home/HomePage';
import { DetachedFileWindowPage } from '@pages/window/DetachedFileWindowPage';
import { DetachedSidebarWindowPage } from '@pages/window/DetachedSidebarWindowPage';
import { PluginRoutePage } from '@pages/workspace/PluginRoutePage';
import { WorkspacePage } from '@pages/workspace/WorkspacePage';
import { PluginSettingsPage } from '@plugins/settings/PluginSettingsPage';
import { PluginSettingsHostPage } from '@plugins/settings/PluginSettingsHostPage';
import { SettingsPage } from '@plugins/settings/SettingsPage';
import { WorkspaceTabs } from '@kernel/workspace/ui/WorkspaceTabs';
import { PlaywrightEditorHarness } from '@pages/playwright/PlaywrightEditorHarness';
import styles from './AppRouter.module.scss';

function AppLayout() {
  return (
    <div className={styles.root}>
      <WorkspaceTabs />
      <div className={styles.headerDivider} aria-hidden="true" />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace/:voltId/plugin/:pageId" element={<PluginRoutePage />} />
          <Route path="/workspace/:voltId" element={<WorkspacePage />} />
          <Route path="/settings" element={<SettingsPage section="general" />} />
          <Route path="/settings/shortcuts" element={<SettingsPage section="shortcuts" />} />
          <Route path="/settings/plugins" element={<PluginSettingsPage />} />
          <Route path="/settings/plugin/:pluginId" element={<PluginSettingsHostPage />} />
          <Route path="/settings/about" element={<SettingsPage section="about" />} />
          {import.meta.env.DEV && (
            <>
              <Route path="/__playwright__/editor" element={<PlaywrightEditorHarness />} />
              <Route path="/__playwright__/settings/shortcuts" element={<SettingsPage section="shortcuts" />} />
            </>
          )}
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
        <Route path="/window/file" element={<DetachedFileWindowPage />} />
        <Route path="/window/sidebar" element={<DetachedSidebarWindowPage />} />
      </Routes>
    </BrowserRouter>
  );
}
