import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { getSignups } from '../src/handlers';
import { resetConfigCache } from '../src/config';

const CONFIG = {
  season: '2026-27',
  people: ['Jasper', 'Eli', 'Steve H'],
  meetingDates: ['2026-08-16', '2026-09-13'],
};

beforeEach(async () => {
  resetConfigCache();
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(CONFIG))) as any;
  await env.DB.prepare('DELETE FROM signups').run();
});

async function body(res: Response) {
  return await res.json();
}

describe('getSignups', () => {
  it('returns the whole roster for a meeting nobody has touched', async () => {
    const res = await getSignups(env as any, '2026-09-13');
    expect(res.status).toBe(200);
    const data: any = await body(res);
    expect(data.meetingDate).toBe('2026-09-13');
    expect(data.rsvps).toEqual([
      { name: 'Jasper', status: '' },
      { name: 'Eli', status: '' },
      { name: 'Steve H', status: '' },
    ]);
    expect(data.snack).toBeNull();
  });

  it('merges stored values over the blank roster', async () => {
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-08-16','Jasper','rsvp','👍','2026-08-16T00:00:00Z')"
    ).run();
    const data: any = await body(await getSignups(env as any, '2026-08-16'));
    expect(data.rsvps).toEqual([
      { name: 'Jasper', status: '👍' },
      { name: 'Eli', status: '' },
      { name: 'Steve H', status: '' },
    ]);
  });

  it('reports the snack assignee', async () => {
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-08-16','Eli','snack','1','2026-08-16T00:00:00Z')"
    ).run();
    const data: any = await body(await getSignups(env as any, '2026-08-16'));
    expect(data.snack).toBe('Eli');
  });

  it('rejects a date outside the season', async () => {
    const res = await getSignups(env as any, '2030-01-01');
    expect(res.status).toBe(400);
  });

  it('rejects a timestamp date', async () => {
    const res = await getSignups(env as any, '2026-08-16T07:00:00.000Z');
    expect(res.status).toBe(400);
  });

  it('serves reads even when the config is unavailable', async () => {
    resetConfigCache();
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as any;
    const res = await getSignups(env as any, '2026-08-16');
    expect(res.status).toBe(200);
    const data: any = await body(res);
    expect(data.rsvps).toEqual([]);
  });
});
