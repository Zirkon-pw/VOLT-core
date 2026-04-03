import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/manrope/index.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/jetbrains-mono/index.css';
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
