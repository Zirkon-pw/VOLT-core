import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  resolve: {
    alias: [
      { find: '@app', replacement: path.resolve(__dirname, 'src/app') },
      { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      { find: '@kernel', replacement: path.resolve(__dirname, 'src/kernel') },
      { find: '@plugins', replacement: path.resolve(__dirname, 'src/plugins') },
    ],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
