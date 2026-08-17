import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, isValidDate, resetConfigCache } from '../src/config';

const CONFIG = {
  season: '2026-27',
  people: ['Jasper', 'Steve H'],
  meetingDates: ['2026-08-16', '2026-08-23'],
};

function envWith(fetchImpl: typeof fetch) {
  globalThis.fetch = fetchImpl as any;
  return { CONFIG_URL: 'https://example.test/signups-config.json' } as any;
}

beforeEach(() => resetConfigCache());

describe('isValidDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidDate('2026-08-16')).toBe(true);
  });

  it('rejects a timestamp form, rather than coercing it', () => {
    expect(isValidDate('2026-08-16T07:00:00.000Z')).toBe(false);
  });

  it('rejects nonsense', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('16-08-2026')).toBe(false);
    expect(isValidDate('2026-8-6')).toBe(false);
  });
});

describe('loadConfig', () => {
  it('fetches and returns the config', async () => {
    const env = envWith(async () => new Response(JSON.stringify(CONFIG)));
    expect(await loadConfig(env)).toEqual(CONFIG);
  });

  it('caches, so a second call does not refetch', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify(CONFIG)));
    const env = envWith(spy as any);
    await loadConfig(env);
    await loadConfig(env);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns null when the fetch fails and nothing is cached', async () => {
    const env = envWith(async () => new Response('nope', { status: 500 }));
    expect(await loadConfig(env)).toBeNull();
  });

  it('rejects a 200 whose body is not a config, rather than caching it', async () => {
    const env = envWith(async () => new Response(JSON.stringify({ nope: true })));
    expect(await loadConfig(env)).toBeNull();
  });

  it('rejects a 200 with the right keys but the wrong types', async () => {
    const env = envWith(
      async () =>
        new Response(JSON.stringify({ season: '2026-27', people: 'Jasper', meetingDates: [] }))
    );
    expect(await loadConfig(env)).toBeNull();
  });

  it('serves the stale cache rather than a malformed fresh body', async () => {
    let good = true;
    const env = envWith(async () =>
      good ? new Response(JSON.stringify(CONFIG)) : new Response('<html>oops</html>')
    );
    await loadConfig(env);
    resetConfigCache.ttlExpire();
    good = false;
    expect(await loadConfig(env)).toEqual(CONFIG);
  });

  it('serves the stale cache when a later fetch fails', async () => {
    let ok = true;
    const env = envWith(async () =>
      ok ? new Response(JSON.stringify(CONFIG)) : new Response('nope', { status: 500 })
    );
    await loadConfig(env);
    resetConfigCache.ttlExpire();
    ok = false;
    expect(await loadConfig(env)).toEqual(CONFIG);
  });
});
