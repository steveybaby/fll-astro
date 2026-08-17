import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { getAllSignups } from '../src/handlers';
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

describe('getAllSignups', () => {
  it('returns every configured date with a blank roster when nothing is stored', async () => {
    const res = await getAllSignups(env as any);
    expect(res.status).toBe(200);
    const data: any = await body(res);
    expect(data.meetings).toEqual([
      {
        meetingDate: '2026-08-16',
        rsvps: [
          { name: 'Jasper', status: '' },
          { name: 'Eli', status: '' },
          { name: 'Steve H', status: '' },
        ],
        snack: null,
      },
      {
        meetingDate: '2026-09-13',
        rsvps: [
          { name: 'Jasper', status: '' },
          { name: 'Eli', status: '' },
          { name: 'Steve H', status: '' },
        ],
        snack: null,
      },
    ]);
  });

  it('merges stored values into the right meeting only', async () => {
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-08-16','Jasper','rsvp','👍','2026-08-16T00:00:00Z')"
    ).run();
    const data: any = await body(await getAllSignups(env as any));
    const aug = data.meetings.find((m: any) => m.meetingDate === '2026-08-16');
    const sep = data.meetings.find((m: any) => m.meetingDate === '2026-09-13');
    expect(aug.rsvps).toEqual([
      { name: 'Jasper', status: '👍' },
      { name: 'Eli', status: '' },
      { name: 'Steve H', status: '' },
    ]);
    expect(sep.rsvps).toEqual([
      { name: 'Jasper', status: '' },
      { name: 'Eli', status: '' },
      { name: 'Steve H', status: '' },
    ]);
  });

  it('reports the snack assignee per meeting', async () => {
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-08-16','Eli','snack','1','2026-08-16T00:00:00Z')"
    ).run();
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-09-13','Jasper','snack','1','2026-09-13T00:00:00Z')"
    ).run();
    const data: any = await body(await getAllSignups(env as any));
    const aug = data.meetings.find((m: any) => m.meetingDate === '2026-08-16');
    const sep = data.meetings.find((m: any) => m.meetingDate === '2026-09-13');
    expect(aug.snack).toBe('Eli');
    expect(sep.snack).toBe('Jasper');
  });

  it('serves reads even when the config is unavailable, grouping whatever rows exist', async () => {
    await env.DB.prepare(
      "INSERT INTO signups VALUES ('2026-08-16','Jasper','rsvp','👍','2026-08-16T00:00:00Z')"
    ).run();
    resetConfigCache();
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as any;
    const res = await getAllSignups(env as any);
    expect(res.status).toBe(200);
    const data: any = await body(res);
    expect(data.meetings).toEqual([
      {
        meetingDate: '2026-08-16',
        rsvps: [{ name: 'Jasper', status: '👍' }],
        snack: null,
      },
    ]);
  });

  it('returns no meetings when config is unavailable and nothing is stored', async () => {
    resetConfigCache();
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as any;
    const res = await getAllSignups(env as any);
    expect(res.status).toBe(200);
    const data: any = await body(res);
    expect(data.meetings).toEqual([]);
  });
});
