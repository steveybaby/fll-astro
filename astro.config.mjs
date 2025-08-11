// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // The site property should be your final deployed URL
  site: 'https://steveybaby.github.io',
  // Base path for GitHub Pages deployment
  base: '/fll-astro',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
