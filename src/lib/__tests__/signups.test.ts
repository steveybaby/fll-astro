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

const ALL_PAYLOAD = {
  meetings: [
    {
      meetingDate: '2026-08-16',
      rsvps: [
        { name: 'Jasper', status: '' },
        { name: 'Eli', status: '👍' },
      ],
      snack: 'Eli',
    },
    {
      meetingDate: '2026-09-13',
      rsvps: [
        { name: 'Jasper', status: '👍' },
        { name: 'Eli', status: '' },
      ],
      snack: null,
    },
  ],
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

describe('read timeout', () => {
  /** A request that never settles and ignores the abort signal, as a stalled
   *  mobile connection does. */
  function mockHungFetch() {
    const spy = vi.fn(() => new Promise<Response>(() => {}));
    globalThis.fetch = spy as any;
    return spy;
  }

  it('rejects a hung single-meeting read rather than hanging', async () => {
    mockHungFetch();
    await expect(getRSVPs('2026-09-13', 20)).rejects.toThrow(/timed out/);
  });

  it('rejects a hung bulk read rather than hanging', async () => {
    mockHungFetch();
    await expect(getRSVPs(undefined, 20)).rejects.toThrow(/timed out/);
  });

  it('rejects a hung snack read rather than hanging', async () => {
    mockHungFetch();
    await expect(getSnacks('2026-09-13', 20)).rejects.toThrow(/timed out/);
  });

  it('passes an abort signal so the underlying request is cancelled too', async () => {
    const spy = mockHungFetch();
    await expect(getRSVPs('2026-09-13', 20)).rejects.toThrow();
    const [, init] = spy.mock.calls[0] as any;
    expect(init.signal.aborted).toBe(true);
  });

  it('fails both callers of a coalesced read, and leaves the map usable', async () => {
    mockHungFetch();
    const both = Promise.all([getRSVPs('2026-09-13', 20), getSnacks('2026-09-13', 20)]);
    await expect(both).rejects.toThrow(/timed out/);

    // The timed-out entry must have been evicted, not left behind to serve a
    // rejected promise to every later caller.
    const spy = mockFetch();
    expect(await getRSVPs('2026-09-13')).toEqual([
      { meetingDate: '2026-09-13', kids: PAYLOAD.rsvps },
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('defaults to a bounded read when no timeout is given', async () => {
    const spy = mockFetch();
    await getRSVPs('2026-09-13');
    const [, init] = spy.mock.calls[0] as any;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('bulk reads (no date)', () => {
  it('hits /signups/all and returns one MeetingRecord per meeting', async () => {
    const spy = mockFetch(ALL_PAYLOAD);
    const out = await getRSVPs();
    const [url] = spy.mock.calls[0] as any;
    expect(String(url)).toMatch(/\/signups\/all$/);
    expect(out).toEqual([
      {
        meetingDate: '2026-08-16',
        kids: [
          { name: 'Jasper', status: '' },
          { name: 'Eli', status: '👍' },
        ],
      },
      {
        meetingDate: '2026-09-13',
        kids: [
          { name: 'Jasper', status: '👍' },
          { name: 'Eli', status: '' },
        ],
      },
    ]);
  });

  it('maps the snack assignee per meeting into the legacy shape', async () => {
    mockFetch(ALL_PAYLOAD);
    const out = await getSnacks();
    expect(out).toEqual([
      {
        meetingDate: '2026-08-16',
        kids: [
          { name: 'Jasper', status: '' },
          { name: 'Eli', status: '🍰' },
        ],
      },
      {
        meetingDate: '2026-09-13',
        kids: [
          { name: 'Jasper', status: '' },
          { name: 'Eli', status: '' },
        ],
      },
    ]);
  });

  it('issues ONE request when both bulk readers are called together', async () => {
    const spy = mockFetch(ALL_PAYLOAD);
    await Promise.all([getRSVPs(), getSnacks()]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('issues a separate request for a bulk read vs. a single-date read', async () => {
    const spy = mockFetch(ALL_PAYLOAD);
    await Promise.all([getRSVPs(), getRSVPs('2026-09-13')]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-2xx bulk response', async () => {
    mockFetch(ALL_PAYLOAD, false);
    await expect(getRSVPs()).rejects.toThrow();
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

  it('invalidates the bulk cache too, so a season grid refetches after a write', async () => {
    const spy = mockFetch(ALL_PAYLOAD);
    await getRSVPs(); // populates the bulk cache
    await updateRSVP('2026-09-13', 'Eli', '👍'); // write, mockFetch payload is reused for the POST body too
    await getRSVPs(); // must refetch, not reuse the stale bulk entry
    expect(spy).toHaveBeenCalledTimes(3); // bulk read, write, bulk read
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
