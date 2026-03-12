import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  output: 'static',
  site: 'https://greybrainer-lens-dev.pages.dev',
});
