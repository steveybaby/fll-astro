import type { APIRoute } from 'astro';
import { getCurrentSeason } from '../config/season';
import { getSeasonContent } from '../utils/season';
import { buildSignupsConfig } from '../lib/signups-config';

export const GET: APIRoute = async () => {
  const season = getCurrentSeason();
  const meetings = await getSeasonContent('meetings');
  const config = buildSignupsConfig(season, meetings as any);

  return new Response(JSON.stringify(config, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      // The Worker fetches this cross-origin.
      'Access-Control-Allow-Origin': '*',
    },
  });
};
