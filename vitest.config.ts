import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      // Astro's virtual "astro:content" module only exists under Astro's own
      // vite plugin, which vitest does not load. Point it at a stub so
      // modules that import getCollection at module scope (e.g.
      // src/utils/season.ts) can still be loaded for unit testing their
      // other, pure exports. See src/utils/__mocks__/astro-content.ts.
      'astro:content': path.resolve(__dirname, 'src/utils/__mocks__/astro-content.ts'),
    },
  },
});
