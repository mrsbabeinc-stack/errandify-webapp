import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all network interfaces
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '10.11.146.187',
      '192.168.1.206',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
        // The backend's CORS allowlist (backend/src/index.ts) only knows about
        // localhost:5173. When the page is served over a tunnel the browser
        // sends Origin: https://<something>.trycloudflare.com, and the proxy
        // forwards it verbatim, so every request would be rejected. changeOrigin
        // only rewrites Host, not Origin — so rewrite Origin here too. The
        // browser still sees one same-origin app, and this is dev-server-only
        // config that never ships in a build.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5173');
          });
        },
      },
      // Kept alongside /api so socket traffic behaves the same over a tunnel as
      // it does on localhost, rather than hitting the SPA fallback and getting
      // HTML back. (The socket server itself is currently unwired.)
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
