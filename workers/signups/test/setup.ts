import { applyD1Migrations, env } from 'cloudflare:test';

/**
 * See vitest.config.ts: `TEST_MIGRATIONS` is schema.sql, read once at config
 * time and applied here to the fresh D1 instance each test file gets, so the
 * `signups` table exists before any test runs.
 */
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
