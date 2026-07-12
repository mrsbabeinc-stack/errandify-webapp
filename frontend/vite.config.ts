import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all network interfaces
    allowedHosts: ['localhost', '127.0.0.1', '10.11.146.187', '192.168.1.206', '.ngrok-free.dev', '.ngrok.io'],
  },
  build: {
    outDir: 'dist',
  },
});
