import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  integrations: [
    react()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  vite: {
    server: {
      allowedHosts: true,
      cors: true,
      hmr: false
    }
  }
});
