import { describe, it, expect } from 'vitest';
import { getMeetingDateTime } from '../calendar';

// Helper: the UTC hour a Pacific-local meeting time maps to.
const utcHour = (isoDate: string, startTime: string) =>
  getMeetingDateTime(new Date(`${isoDate}T00:00:00Z`), startTime, 2).date.getUTCHours();

describe('getMeetingDateTime DST handling', () => {
  it('uses PDT (UTC-7) for a summer meeting', () => {
    // 2026-08-16 14:00 PDT === 21:00 UTC
    expect(utcHour('2026-08-16', '14:00')).toBe(21);
  });

  it('uses PST (UTC-8) for a December meeting', () => {
    // 2026-12-13 14:00 PST === 22:00 UTC
    expect(utcHour('2026-12-13', '14:00')).toBe(22);
  });

  it('uses PST on 2026-11-01, the day DST ends', () => {
    // DST ends 2am local on 2026-11-01; a 2pm meeting is after the switch.
    expect(utcHour('2026-11-01', '14:00')).toBe(22);
  });

  it('uses PDT on 2026-10-25, the Sunday before DST ends', () => {
    expect(utcHour('2026-10-25', '14:00')).toBe(21);
  });

  it('treats 2026-03-08 as PDT (second Sunday in March)', () => {
    // Regression: the buggy version computed DST start as 2026-03-15,
    // so this date was wrongly treated as PST.
    expect(utcHour('2026-03-08', '14:00')).toBe(21);
  });

  it('treats 2026-03-07 as PST (day before DST starts)', () => {
    expect(utcHour('2026-03-07', '14:00')).toBe(22);
  });

  it('preserves the explicit duration', () => {
    const { duration } = getMeetingDateTime(new Date('2026-08-16T00:00:00Z'), '14:00', 2);
    expect(duration).toBe(2);
  });
});
