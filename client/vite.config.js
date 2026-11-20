import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    allowedHosts: true,
    // Reenvía las subidas a IPFS al proxy local (server/ipfs-proxy.js), que guarda el PINATA_JWT.
    proxy: {
      '/api/ipfs': 'http://localhost:8787',
    },
  },
});
