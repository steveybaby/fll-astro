export function formatMeetingTime(startTime?: string, duration?: number): string {
  if (!startTime) {
    return '';
  }
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
  
  const timeString = `${displayHour}${displayMinutes}${period}`;
  
  if (duration) {
    const durationText = duration === 1 ? '1 hour' : `${duration} hours`;
    return `${timeString} (${durationText})`;
  }
  
  return timeString;
}

export function formatMeetingTimeOrTBD(
  startTime?: string,
  duration?: number,
  timeTBD = false
): string {
  if (timeTBD) {
    const durationText = duration === 1 ? '1 hour' : `${duration} hours`;
    return duration ? `Time TBD (${durationText})` : 'Time TBD';
  }
  return formatMeetingTime(startTime, duration);
}
/** The team meets in California; "today" must be judged there, not in UTC. */
const TEAM_TIMEZONE = 'America/Los_Angeles';

const calendarDay = (d: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);

/**
 * True when a meeting falls today or later.
 *
 * Meeting dates are stored as UTC midnight. Comparing that Date against a local
 * `new Date()` makes a meeting disappear from the signup lists on its own
 * morning — in Pacific time, "2026-08-16T00:00:00Z" is actually 5pm on Aug 15,
 * so it sorts before local midnight on the 16th. Comparing calendar days in the
 * team's timezone avoids the whole class of problem.
 */
export function isUpcomingMeeting(
  meetingDate: Date | string,
  now: Date = new Date()
): boolean {
  const date =
    meetingDate instanceof Date ? meetingDate : new Date(`${meetingDate}T00:00:00Z`);
  return calendarDay(date, 'UTC') >= calendarDay(now, TEAM_TIMEZONE);
}
