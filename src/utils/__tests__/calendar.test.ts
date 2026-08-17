import { describe, it, expect } from 'vitest';
import { getMeetingDateTime, formatICSUtcStamp, foldICSLine } from '../calendar';

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

describe('formatICSUtcStamp', () => {
  it('formats a UTC-midnight meeting date', () => {
    expect(formatICSUtcStamp(new Date('2026-08-16T00:00:00Z'))).toBe('20260816T000000Z');
  });

  it('keeps the time component when there is one', () => {
    expect(formatICSUtcStamp(new Date('2026-11-01T22:30:45Z'))).toBe('20261101T223045Z');
  });

  it('drops milliseconds rather than emitting them', () => {
    expect(formatICSUtcStamp(new Date('2026-08-16T00:00:00.789Z'))).toBe('20260816T000000Z');
  });

  it('is stable for the same input', () => {
    const d = new Date('2026-12-13T00:00:00Z');
    expect(formatICSUtcStamp(d)).toBe(formatICSUtcStamp(d));
  });
});

describe('foldICSLine', () => {
  const octets = (s: string) => new TextEncoder().encode(s).length;

  it('leaves a short line alone', () => {
    expect(foldICSLine('SUMMARY:Sunday Session')).toBe('SUMMARY:Sunday Session');
  });

  it('leaves a line of exactly 75 octets alone', () => {
    const line = 'X'.repeat(75);
    expect(foldICSLine(line)).toBe(line);
  });

  it('folds a long line with CRLF + single space', () => {
    const folded = foldICSLine('X'.repeat(200));
    expect(folded).toContain('\r\n ');
    for (const seg of folded.split('\r\n')) {
      expect(octets(seg)).toBeLessThanOrEqual(75);
    }
  });

  it('unfolds back to the original content', () => {
    const original = 'DESCRIPTION:' + 'abcdefghij'.repeat(30);
    // Unfolding per RFC 5545: remove CRLF followed by a single space.
    expect(foldICSLine(original).replace(/\r\n /g, '')).toBe(original);
  });

  it('never splits a multi-byte character', () => {
    // Em dash and bullet are 3 bytes each in UTF-8.
    const original = 'DESCRIPTION:' + '— • '.repeat(40);
    const folded = foldICSLine(original);
    expect(folded.replace(/\r\n /g, '')).toBe(original);
    for (const seg of folded.split('\r\n')) {
      expect(octets(seg)).toBeLessThanOrEqual(75);
      expect(seg).not.toContain('�');
    }
  });
});
