import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://controlemonrevenu.fr',
  integrations: [react(), sitemap()],
  build: { format: 'directory' },
});
