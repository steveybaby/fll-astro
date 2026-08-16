import { describe, it, expect } from 'vitest';
import { formatMeetingTime } from '../meeting-time';

describe('formatMeetingTime', () => {
  it('formats an afternoon start time', () => {
    expect(formatMeetingTime('14:00')).toBe('2pm');
  });

  it('includes minutes when non-zero', () => {
    expect(formatMeetingTime('15:30')).toBe('3:30pm');
  });

  it('appends singular hour for a one-hour meeting', () => {
    expect(formatMeetingTime('14:00', 1)).toBe('2pm (1 hour)');
  });

  it('appends plural hours otherwise', () => {
    expect(formatMeetingTime('14:00', 2)).toBe('2pm (2 hours)');
  });

  it('returns empty string when startTime is missing', () => {
    expect(formatMeetingTime(undefined, 2)).toBe('');
  });
});
