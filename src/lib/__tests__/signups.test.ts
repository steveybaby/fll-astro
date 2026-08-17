import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRSVPs,
  getSnacks,
  updateRSVP,
  assignSnack,
  removeSnack,
  resetSignupCache,
} from '../signups';

const PAYLOAD = {
  meetingDate: '2026-09-13',
  rsvps: [
    { name: 'Jasper', status: '👍' },
    { name: 'Eli', status: '' },
  ],
  snack: 'Jasper',
};

function mockFetch(payload: unknown = PAYLOAD, ok = true) {
  const spy = vi.fn(async () =>
    ok
      ? new Response(JSON.stringify(payload), { status: 200 })
      : new Response('boom', { status: 500 })
  );
  globalThis.fetch = spy as any;
  return spy;
}

beforeEach(() => resetSignupCache());

describe('reads', () => {
  it('returns kids in the legacy MeetingRecord shape', async () => {
    mockFetch();
    const out = await getRSVPs('2026-09-13');
    expect(out).toEqual([
      { meetingDate: '2026-09-13', kids: [
        { name: 'Jasper', status: '👍' },
        { name: 'Eli', status: '' },
      ] },
    ]);
  });

  it('maps the snack assignee into the legacy shape', async () => {
    mockFetch();
    const out = await getSnacks('2026-09-13');
    expect(out[0].kids).toEqual([
      { name: 'Jasper', status: '🍰' },
      { name: 'Eli', status: '' },
    ]);
  });

  it('issues ONE fetch when both readers ask for the same date', async () => {
    const spy = mockFetch();
    await Promise.all([getRSVPs('2026-09-13'), getSnacks('2026-09-13')]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fetches separately for different dates', async () => {
    const spy = mockFetch();
    await Promise.all([getRSVPs('2026-09-13'), getRSVPs('2026-08-16')]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch(PAYLOAD, false);
    await expect(getRSVPs('2026-09-13')).rejects.toThrow();
  });
});

describe('writes', () => {
  it('posts an rsvp and reports success', async () => {
    const spy = mockFetch({ ok: true });
    const res = await updateRSVP('2026-09-13', 'Eli', '👍');
    expect(res).toEqual({ success: true });
    const [url, init] = spy.mock.calls[0] as any;
    expect(String(url)).toMatch(/\/rsvp$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ date: '2026-09-13', name: 'Eli', status: '👍' });
  });

  it('invalidates the cache so the next read refetches', async () => {
    const spy = mockFetch();
    await getRSVPs('2026-09-13');
    await updateRSVP('2026-09-13', 'Eli', '👍');
    await getRSVPs('2026-09-13');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('assigns a snack by POST', async () => {
    const spy = mockFetch({ ok: true });
    await assignSnack('2026-09-13', 'Eli');
    const [url, init] = spy.mock.calls[0] as any;
    expect(String(url)).toMatch(/\/snack$/);
    expect(init.method).toBe('POST');
  });

  it('removes a snack by DELETE with query params, not a body', async () => {
    const spy = mockFetch({ ok: true });
    await removeSnack('2026-09-13', 'Eli');
    const [url, init] = spy.mock.calls[0] as any;
    expect(String(url)).toContain('date=2026-09-13');
    expect(String(url)).toContain('name=Eli');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it('resolves to success:false on a non-2xx write', async () => {
    mockFetch({ ok: true }, false);
    expect(await updateRSVP('2026-09-13', 'Eli', '👍')).toEqual({ success: false });
  });
});
