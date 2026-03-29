import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    assetsInlineLimit: 100_000_000,
    emptyOutDir: true,
    outDir: 'dist',
    lib: {
      entry: 'src/main.tsx',
      formats: ['iife'],
      name: 'VoltBoardsPlugin',
      fileName: () => 'main.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        banner: 'var process = globalThis.process || { env: { NODE_ENV: "production" }, versions: {} };',
        footer: '\n(typeof VoltBoardsPlugin === "function" ? VoltBoardsPlugin : VoltBoardsPlugin && typeof VoltBoardsPlugin.default === "function" ? VoltBoardsPlugin.default : function(){ throw new Error("VoltBoardsPlugin entrypoint not found"); })(api);\n',
      },
    },
  },
});
