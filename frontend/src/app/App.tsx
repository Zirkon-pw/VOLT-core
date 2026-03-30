import { useEffect } from 'react';
import { ThemeProvider } from './providers/ThemeProvider';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { I18nProvider } from './providers/I18nProvider';
import { AppRouter } from './routes/AppRouter';
import { ToastController } from '@shared/ui/toast';
import { PluginPromptDialog } from '@features/plugin-prompt';
import { PluginTaskStatusController } from '@features/plugin-task-status';
import './styles/globals.scss';

function App() {
  useEffect(() => {
    // Prevent browser from navigating to dropped files.
    // Only prevent if the event wasn't already handled by a child (e.g. editor panel).
    const prevent = (e: DragEvent) => {
      if (!e.defaultPrevented) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <AppRouter />
          <PluginTaskStatusController />
          <ToastController />
          <PluginPromptDialog />
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
