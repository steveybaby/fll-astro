import { describe, it, expect } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index';

describe('worker skeleton', () => {
  it('answers /health', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(new Request('https://x/health'), env as any, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('404s an unknown path, as JSON', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(new Request('https://x/nope'), env as any, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('answers preflight with CORS headers', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('https://x/signups', { method: 'OPTIONS' }),
      env as any,
      ctx
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('has a D1 binding available to later tasks', async () => {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS probe (x TEXT)"
    ).run();
    const { results } = await env.DB.prepare('SELECT 1 AS ok').all();
    expect(results?.[0]).toEqual({ ok: 1 });
  });
});
