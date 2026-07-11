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
      rollupOptions: {
        output: {
          manualChunks: {
            // React core — selalu dibutuhkan
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // Chart library — hanya dimuat di halaman yang ada grafik
            'charts': ['recharts'],
            
            // Animation — dimuat terpisah
            'motion': ['motion'],
            
            // Farmasi tools — hanya halaman farmasi
            'farmasi-tools': ['exceljs', 'papaparse'],
            
            // UI utilities
            'ui-utils': ['sweetalert2', 'lucide-react'],
            
            // HTTP + state
            'data-layer': ['axios', 'zustand'],
          }
        }
      },
      // Chunk maksimal 500KB sebelum warning
      chunkSizeWarningLimit: 500,
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
