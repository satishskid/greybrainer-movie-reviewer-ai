import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  output: 'static',
  site: 'https://cinema.greybrain.ai',
  build: {
    // Clean asset output for Cloudflare Pages
    assets: '_astro',
  },
  vite: {
    build: {
      // Ensure assets are self-contained
      assetsInlineLimit: 0,
    },
  },
});
