import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://elKevin24.github.io',
  base: '/Metrica-AV-Y-RTU',
  outDir: './dist',
  devToolbar: {
    enabled: false
  },
  integrations: [
    react(),
    tailwind()
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

