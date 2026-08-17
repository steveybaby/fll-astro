import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  // vitest-pool-workers gives each test file a fresh, empty D1 instance.
  // `schema.sql` is otherwise only ever applied to the persistent local/remote
  // databases via `wrangler d1 execute`, never to this ephemeral one. Reusing
  // readD1Migrations/applyD1Migrations against the same schema.sql that
  // production uses (rather than a second, hand-copied schema for tests) is
  // the pattern Cloudflare documents for this; see test/setup.ts.
  const migrations = await readD1Migrations(path.join(__dirname));

  return {
    test: {
      include: ['test/**/*.test.ts'],
      setupFiles: ['./test/setup.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            d1Databases: ['DB'],
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
