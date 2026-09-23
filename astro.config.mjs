import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
const basePath = isGitHubActions ? '/Metrica-AV-Y-RTU' : '/';

export default defineConfig({
  site: 'https://elKevin24.github.io',
  base: basePath,
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
