import { describe, it, expect } from 'vitest';
import { formatMeetingTime, formatMeetingTimeOrTBD, isUpcomingMeeting } from '../meeting-time';

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

describe('formatMeetingTimeOrTBD', () => {
  it('reports TBD with duration when the time is unconfirmed', () => {
    expect(formatMeetingTimeOrTBD('09:00', 2, true)).toBe('Time TBD (2 hours)');
  });

  it('falls through to the normal format when confirmed', () => {
    expect(formatMeetingTimeOrTBD('14:00', 2, false)).toBe('2pm (2 hours)');
  });
});

describe('isUpcomingMeeting', () => {
  // 11am Pacific on the day of the meeting.
  const duringMeetingDay = new Date('2026-08-16T18:00:00Z');

  it("keeps a meeting on its own day, even after the day has started", () => {
    expect(isUpcomingMeeting('2026-08-16', duringMeetingDay)).toBe(true);
  });

  it('keeps future meetings', () => {
    expect(isUpcomingMeeting('2026-08-23', duringMeetingDay)).toBe(true);
  });

  it('drops meetings that have already passed', () => {
    expect(isUpcomingMeeting('2026-08-09', duringMeetingDay)).toBe(false);
  });

  it('still keeps today late in the Pacific evening', () => {
    // 11pm Pacific on Aug 16 is Aug 17 in UTC — the naive comparison fails here.
    expect(isUpcomingMeeting('2026-08-16', new Date('2026-08-17T06:00:00Z'))).toBe(true);
  });

  it('drops yesterday once the Pacific day rolls over', () => {
    expect(isUpcomingMeeting('2026-08-16', new Date('2026-08-17T18:00:00Z'))).toBe(false);
  });

  it('accepts a Date as well as a string', () => {
    expect(isUpcomingMeeting(new Date('2026-08-16T00:00:00Z'), duringMeetingDay)).toBe(true);
  });
});
