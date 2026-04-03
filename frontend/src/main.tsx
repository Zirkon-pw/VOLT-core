import React from 'react';
import { createRoot } from 'react-dom/client';
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
