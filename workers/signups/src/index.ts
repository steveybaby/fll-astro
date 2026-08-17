/**
 * Signups API.
 *
 * Replaces a Google Apps Script web app that took ~2.25s per call and returned
 * the entire season on every request. This serves one meeting per request and
 * always returns the full roster, so the client never has an empty branch to
 * strand its UI on.
 */
import { type Env, CORS, json } from './http';
import { getSignups, getAllSignups, putRsvp, putSnack, clearSnack } from './handlers';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health') {
        return json({ ok: true });
      }

      if (url.pathname === '/signups/all' && request.method === 'GET') {
        return getAllSignups(env);
      }

      if (url.pathname === '/signups' && request.method === 'GET') {
        return getSignups(env, url.searchParams.get('date') ?? '');
      }

      if (url.pathname === '/rsvp' && request.method === 'POST') {
        const b = (await request.json()) as { date?: string; name?: string; status?: string } | null;
        return putRsvp(env, { date: b?.date ?? '', name: b?.name ?? '', status: b?.status ?? '' });
      }

      if (url.pathname === '/snack' && request.method === 'POST') {
        const b = (await request.json()) as { date?: string; name?: string } | null;
        return putSnack(env, { date: b?.date ?? '', name: b?.name ?? '' });
      }

      if (url.pathname === '/snack' && request.method === 'DELETE') {
        return clearSnack(env, {
          date: url.searchParams.get('date') ?? '',
          name: url.searchParams.get('name') ?? '',
        });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      // A D1 failure would otherwise surface as the runtime's plain-text 500,
      // which the client cannot parse. Keep every response JSON so the caller's
      // error path behaves the same whatever went wrong.
      console.error('signups worker error', err);
      return json({ error: 'internal error' }, 500);
    }
  },
};
