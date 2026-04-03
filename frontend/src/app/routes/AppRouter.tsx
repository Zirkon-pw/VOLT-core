import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@pages/home/HomePage';
import { PluginRoutePage } from '@pages/workspace/PluginRoutePage';
import { WorkspacePage } from '@pages/workspace/WorkspacePage';
import { PluginSettingsPage } from '@pages/settings/PluginSettingsPage';
import { PluginSettingsHostPage } from '@pages/settings/PluginSettingsHostPage';
import { SettingsPage } from '@pages/settings/SettingsPage';
import { PlaywrightEditorHarness } from '@pages/playwright/PlaywrightEditorHarness';
import { WorkspaceTabs } from '@widgets/workspace-tabs';
import styles from './AppRouter.module.scss';

function AppLayout() {
  return (
    <div className={styles.root}>
      <WorkspaceTabs />
      <div className={styles.content}>
        <Routes>
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
        </Routes>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
