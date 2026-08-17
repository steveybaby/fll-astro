import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { putRsvp, putSnack, clearSnack } from '../src/handlers';
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

async function rows(kind: string) {
  const { results } = await env.DB.prepare(
    'SELECT person, value FROM signups WHERE kind = ? ORDER BY person'
  )
    .bind(kind)
    .all();
  return results ?? [];
}

describe('putRsvp', () => {
  it('stores a status', async () => {
    const res = await putRsvp(env as any, { date: '2026-09-13', name: 'Eli', status: '👍' });
    expect(res.status).toBe(200);
    expect(await rows('rsvp')).toEqual([{ person: 'Eli', value: '👍' }]);
  });

  it('replaces rather than duplicating on a second write', async () => {
    await putRsvp(env as any, { date: '2026-09-13', name: 'Eli', status: '👍' });
    await putRsvp(env as any, { date: '2026-09-13', name: 'Eli', status: '👎' });
    expect(await rows('rsvp')).toEqual([{ person: 'Eli', value: '👎' }]);
  });

  it('rejects an unknown person and writes nothing', async () => {
    const res = await putRsvp(env as any, { date: '2026-09-13', name: 'Mallory', status: '👍' });
    expect(res.status).toBe(400);
    expect(await rows('rsvp')).toEqual([]);
  });

  it('rejects an unknown date and writes nothing', async () => {
    const res = await putRsvp(env as any, { date: '2030-01-01', name: 'Eli', status: '👍' });
    expect(res.status).toBe(400);
    expect(await rows('rsvp')).toEqual([]);
  });

  it('rejects a status longer than the cap and writes nothing', async () => {
    const res = await putRsvp(env as any, {
      date: '2026-09-13',
      name: 'Eli',
      status: 'x'.repeat(9),
    });
    expect(res.status).toBe(400);
    expect(await rows('rsvp')).toEqual([]);
  });

  it('accepts a status at the cap', async () => {
    const res = await putRsvp(env as any, { date: '2026-09-13', name: 'Eli', status: 'x'.repeat(8) });
    expect(res.status).toBe(200);
  });

  it('refuses to write when the config is unavailable', async () => {
    resetConfigCache();
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as any;
    const res = await putRsvp(env as any, { date: '2026-09-13', name: 'Eli', status: '👍' });
    expect(res.status).toBe(503);
    expect(await rows('rsvp')).toEqual([]);
  });
});

describe('snack duty', () => {
  it('assigns one person', async () => {
    await putSnack(env as any, { date: '2026-09-13', name: 'Jasper' });
    expect(await rows('snack')).toEqual([{ person: 'Jasper', value: '1' }]);
  });

  it('leaves exactly one assignee when a second is assigned', async () => {
    await putSnack(env as any, { date: '2026-09-13', name: 'Jasper' });
    await putSnack(env as any, { date: '2026-09-13', name: 'Eli' });
    expect(await rows('snack')).toEqual([{ person: 'Eli', value: '1' }]);
  });

  it('does not disturb another meeting when reassigning', async () => {
    await putSnack(env as any, { date: '2026-08-16', name: 'Jasper' });
    await putSnack(env as any, { date: '2026-09-13', name: 'Eli' });
    expect((await rows('snack')).length).toBe(2);
  });

  it('clears an assignment', async () => {
    await putSnack(env as any, { date: '2026-09-13', name: 'Jasper' });
    await clearSnack(env as any, { date: '2026-09-13', name: 'Jasper' });
    expect(await rows('snack')).toEqual([]);
  });

  // A kid who leaves the roster mid-season keeps whatever snack row they had.
  // If clearing were roster-gated, that row would be permanently stuck: the UI
  // shows "no one assigned" but D1 disagrees.
  it('clears a row for someone no longer in the config', async () => {
    await env.DB.prepare(
      `INSERT INTO signups (meeting_date, person, kind, value, updated_at)
       VALUES ('2026-09-13', 'DepartedKid', 'snack', '1', '2026-08-01T00:00:00.000Z')`
    ).run();
    const res = await clearSnack(env as any, { date: '2026-09-13', name: 'DepartedKid' });
    expect(res.status).toBe(200);
    expect(await rows('snack')).toEqual([]);
  });

  it('still rejects a bad date when clearing', async () => {
    const res = await clearSnack(env as any, { date: '2030-01-01', name: 'Jasper' });
    expect(res.status).toBe(400);
  });

  it('still refuses to ASSIGN someone not in the config', async () => {
    const res = await putSnack(env as any, { date: '2026-09-13', name: 'DepartedKid' });
    expect(res.status).toBe(400);
    expect(await rows('snack')).toEqual([]);
  });
});
