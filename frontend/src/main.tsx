import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import App from './app/App';
import { installPlaywrightBootstrap } from './pages/playwright/installPlaywrightBootstrap';

if (import.meta.env.DEV && window.location.pathname.startsWith('/__playwright__/')) {
  installPlaywrightBootstrap();
}

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
