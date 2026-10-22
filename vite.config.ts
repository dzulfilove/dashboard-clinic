import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
      viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-select', 'react-select/async-creatable', '@emotion/react']
    },
    
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Vite 8 (Rolldown) hanya menerima manualChunks berupa FUNGSI, bukan objek.
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return;
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('react-select') || id.includes('sweetalert2') || id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router')) return 'vendor-react';
            return;
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
