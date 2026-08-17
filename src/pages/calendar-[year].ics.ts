import { buildSeasonCalendar, icsResponse } from '../lib/ics';
import { CURRENT_SEASON } from '../config/season';

/**
 * Per-season feed, e.g. `/calendar-2026.ics`. This is the URL the site
 * advertises for new subscriptions — each season gets a URL no calendar client
 * has cached, so the first fetch is always live.
 */
export function getStaticPaths() {
  return [{ params: { year: CURRENT_SEASON.split('-')[0] }, props: { season: CURRENT_SEASON } }];
}

export async function GET({ props }: { props: { season: string } }) {
  try {
    const season = props.season;
    return icsResponse(
      await buildSeasonCalendar(season),
      `fll-calendar-${season.split('-')[0]}.ics`
    );
  } catch (error) {
    console.error('Error generating calendar:', error);
    return new Response('Error generating calendar', { status: 500 });
  }
}
