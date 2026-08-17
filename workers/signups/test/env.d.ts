import type { Env } from '../src/http';
import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    /** schema.sql, read once at vitest.config.ts build time; see test/setup.ts. */
    TEST_MIGRATIONS: D1Migration[];
  }
}
