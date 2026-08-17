import { getMeetingDateTime, formatICSUtcStamp, foldICSLine } from '../utils/calendar';
import { getSeasonContent } from '../utils/season';
import { CURRENT_SEASON, getSeason } from '../config/season';

/**
 * The subscription path for a season's calendar, e.g. `/calendar-2026.ics`.
 *
 * Why the year is in the URL: calendar clients — Google especially — cache a
 * subscribed feed by URL and refresh it on their own schedule, often only once
 * or twice a day. When a season resets, everyone subscribed to a stable URL
 * keeps seeing the previous season's events until their client happens to
 * re-fetch, and re-subscribing to the same URL frequently returns the cached
 * copy. A per-season URL sidesteps that entirely: each new season is a URL the
 * client has never seen, so the first fetch is always live.
 *
 * `/calendar.ics` still serves the current season for anyone already
 * subscribed to it.
 */
export function seasonCalendarPath(seasonId: string = CURRENT_SEASON): string {
  return `/calendar-${seasonId.split('-')[0]}.ics`;
}

const TIMEZONE = 'America/Los_Angeles';

/** Format a Date as a floating local time in the team's timezone. */
function formatLocalDateTime(date: Date): string {
  const pacific = date.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // "MM/DD/YYYY, HH:MM:SS"
  const [datePart, timePart] = pacific.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${hours}${minutes}${seconds}`;
}

/**
 * Build the complete iCalendar document for one season.
 *
 * Events carry floating local times plus a VTIMEZONE block rather than UTC
 * stamps, so clients resolve DST themselves from the embedded rules.
 */
export async function buildSeasonCalendar(seasonId: string = CURRENT_SEASON): Promise<string> {
  const meetings = await getSeasonContent('meetings', seasonId);
  const { teamName } = getSeason(seasonId);
  const site = import.meta.env.SITE;

  const events = meetings.map((meeting) => {
    const { date: start, duration } = getMeetingDateTime(
      meeting.data.date,
      meeting.data.startTime,
      meeting.data.duration
    );
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    const meetingUrl = `${site}/meetings/${meeting.slug}/`;
    // An unconfirmed start time must not look confirmed in someone's calendar.
    const summary = meeting.data.timeTBD
      ? `${meeting.data.title} (time TBD)`
      : meeting.data.title;
    const agenda = meeting.data.agenda?.length
      ? `\\n\\nAgenda:\\n${meeting.data.agenda.map((item: string) => `• ${item}`).join('\\n')}`
      : '';
    const description =
      `${teamName} Team Meeting${agenda}` +
      `\\n\\nView full meeting details and notes: ${meetingUrl}` +
      `\\n\\nAll team meetings: ${site}/meeting-plans/`;

    return [
      'BEGIN:VEVENT',
      // UIDs must stay stable across rebuilds or clients duplicate every event.
      // The domain is historical and deliberately frozen — changing it would
      // orphan every existing subscription.
      `UID:meeting-${meeting.slug}@fll-llamas.com`,
      `DTSTAMP:${formatICSUtcStamp(meeting.data.date)}`,
      `DTSTART;TZID=${TIMEZONE}:${formatLocalDateTime(start)}`,
      `DTEND;TZID=${TIMEZONE}:${formatLocalDateTime(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${meeting.data.location || 'Piedmont Makers Club'}`,
      'END:VEVENT',
    ]
      .map(foldICSLine)
      .join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${teamName}//Team Calendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Most clients cache this at subscribe time and never re-read it, so
    // changing it only affects people who subscribe from now on.
    `X-WR-CALNAME:${teamName} Lego Team`,
    'X-WR-CALDESC:FIRST LEGO League team meeting schedule',
    `X-WR-TIMEZONE:${TIMEZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TIMEZONE}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'DTSTART:20070311T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'DTSTART:20071104T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
    .map(foldICSLine)
    .concat(events, ['END:VCALENDAR'])
    .join('\r\n');
}

/** Shared response headers for every calendar endpoint. */
export function icsResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
