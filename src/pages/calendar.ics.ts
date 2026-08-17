import { buildSeasonCalendar, icsResponse } from '../lib/ics';

/**
 * The original, season-agnostic feed URL.
 *
 * Kept permanently for people already subscribed to it. New subscribers are
 * pointed at the per-season URL instead (see `seasonCalendarPath`), because
 * clients cache a feed by URL and a stable URL means a stale season.
 */
export async function GET() {
  try {
    return icsResponse(await buildSeasonCalendar(), 'fll-llamas-calendar.ics');
  } catch (error) {
    console.error('Error generating calendar:', error);
    return new Response('Error generating calendar', { status: 500 });
  }
}
