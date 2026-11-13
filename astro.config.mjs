import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [react(), markdoc({ typographer: true }), keystatic()],
  redirects: { '/admin': '/keystatic', '/work': '/cv' },
  devToolbar: { enabled: false },
});
