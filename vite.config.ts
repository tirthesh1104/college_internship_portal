import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Raise the chunk-size warning threshold to 800 kB — the PDF/chart chunks
      // are legitimately large third-party libraries, not application code.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Vite 8 (rolldown) supports function-based manualChunks
          manualChunks(id: string) {
            // React ecosystem — most frequently cached chunk
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/')
            ) {
              return 'vendor';
            }
            // Recharts — chart library
            if (id.includes('node_modules/recharts/')) {
              return 'charts';
            }
            // Motion / Framer-motion — animation library
            if (
              id.includes('node_modules/motion/') ||
              id.includes('node_modules/framer-motion/')
            ) {
              return 'motion';
            }
            // PDF & canvas — only loaded on resume/report export
            if (
              id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/html2canvas/')
            ) {
              return 'pdf';
            }
            // Lucide icons — large but static, good to cache separately
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons';
            }
            // AI SDK — only loaded on AI assistant pages
            if (
              id.includes('node_modules/@anthropic-ai/') ||
              id.includes('node_modules/@google/genai/')
            ) {
              return 'ai-sdk';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
