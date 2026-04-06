import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import App from './app/App';
import { installPlaywrightBootstrap } from './pages/playwright/installPlaywrightBootstrap';

function normalizeStartupPath() {
  const { pathname, search, hash } = window.location;
  if (pathname === '/index.html') {
    window.history.replaceState(window.history.state, '', `/${search}${hash}`);
  }
}

normalizeStartupPath();

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
