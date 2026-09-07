import { describe, it, expect } from 'vitest';
import { pacificWindowUtc } from '../immich.js';

describe('pacificWindowUtc', () => {
  it('maps noon-7pm on a PDT (daylight, UTC-7) date to the right UTC instants', () => {
    // 2026-09-06 is during Pacific Daylight Time (UTC-7).
    // noon PDT = 19:00 UTC same day; 7pm PDT = 02:00 UTC the next day.
    const { takenAfter, takenBefore } = pacificWindowUtc('2026-09-06');
    expect(takenAfter).toBe('2026-09-06T19:00:00.000Z');
    expect(takenBefore).toBe('2026-09-07T02:00:00.000Z');
  });

  it('maps noon-7pm on a PST (standard, UTC-8) date to the right UTC instants', () => {
    // 2026-01-10 is during Pacific Standard Time (UTC-8).
    // noon PST = 20:00 UTC same day; 7pm PST = 03:00 UTC the next day.
    const { takenAfter, takenBefore } = pacificWindowUtc('2026-01-10');
    expect(takenAfter).toBe('2026-01-10T20:00:00.000Z');
    expect(takenBefore).toBe('2026-01-11T03:00:00.000Z');
  });

  it('rejects a malformed date string', () => {
    expect(() => pacificWindowUtc('09/06/2026')).toThrow();
  });
});
