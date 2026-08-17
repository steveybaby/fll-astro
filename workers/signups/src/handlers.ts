import type { Env } from './http';
import { json } from './http';
import { loadConfig, isValidDate } from './config';

interface Row {
  person: string;
  kind: string;
  value: string;
}

/**
 * Everything for one meeting.
 *
 * Always returns the full roster with blanks for anyone who has not answered.
 * The previous backend returned nothing at all for a meeting with no stored
 * rows, and the client rendered an error instead of controls — which meant the
 * first RSVP for a meeting could never be made.
 *
 * Reads survive a missing config: the roster is only needed to decide the order
 * and to include people with no stored value, so without it we return exactly
 * what is stored. Writes are the operations that must not proceed unvalidated.
 */
export async function getSignups(env: Env, date: string): Promise<Response> {
  if (!isValidDate(date)) {
    return json({ error: 'invalid date format, expected YYYY-MM-DD' }, 400);
  }

  const config = await loadConfig(env);
  if (config && !config.meetingDates.includes(date)) {
    return json({ error: 'unknown meeting date' }, 400);
  }

  const { results } = await env.DB.prepare(
    'SELECT person, kind, value FROM signups WHERE meeting_date = ?'
  )
    .bind(date)
    .all<Row>();

  const rows = results ?? [];
  const statuses = new Map(
    rows.filter((r) => r.kind === 'rsvp').map((r) => [r.person, r.value])
  );
  const snackRow = rows.find((r) => r.kind === 'snack');

  const people = config ? config.people : [...statuses.keys()];

  return json({
    meetingDate: date,
    rsvps: people.map((name) => ({ name, status: statuses.get(name) ?? '' })),
    snack: snackRow ? snackRow.person : null,
  });
}

/**
 * Every meeting in one response, for the season-wide grids.
 *
 * The old Apps Script backend supported this as its "no date" mode; the client
 * pages that render a full-season table (rsvps.astro, coach_rsvps.astro,
 * snacks.astro) still call the seam that way. One query, grouped in JS — not
 * one query per meeting, which would multiply round-trips by the season length
 * for no benefit.
 *
 * Same degrade behaviour as getSignups: a missing config still returns 200,
 * built from whatever rows are actually stored rather than the configured
 * roster/dates.
 */
export async function getAllSignups(env: Env): Promise<Response> {
  const config = await loadConfig(env);

  const { results } = await env.DB.prepare(
    'SELECT meeting_date, person, kind, value FROM signups'
  ).all<Row & { meeting_date: string }>();

  const rows = results ?? [];
  const byDate = new Map<string, Array<Row & { meeting_date: string }>>();
  for (const row of rows) {
    const list = byDate.get(row.meeting_date);
    if (list) list.push(row);
    else byDate.set(row.meeting_date, [row]);
  }

  const dates = config ? config.meetingDates : [...byDate.keys()];

  const meetings = dates.map((date) => {
    const dateRows = byDate.get(date) ?? [];
    const statuses = new Map(
      dateRows.filter((r) => r.kind === 'rsvp').map((r) => [r.person, r.value])
    );
    const snackRow = dateRows.find((r) => r.kind === 'snack');
    const people = config ? config.people : [...statuses.keys()];

    return {
      meetingDate: date,
      rsvps: people.map((name) => ({ name, status: statuses.get(name) ?? '' })),
      snack: snackRow ? snackRow.person : null,
    };
  });

  return json({ meetings });
}

interface WriteParams {
  date: string;
  name: string;
  status?: string;
}

/**
 * Longest status the client ever sends is a single emoji ('👍' / '👎'), which
 * is two UTF-16 units. Eight leaves room without letting one unauthenticated
 * POST store an arbitrarily large string in the `value` column.
 */
const MAX_STATUS_LENGTH = 8;

/**
 * Date half of the write gate. Unlike reads, a write must not proceed on a
 * stale-or-absent roster, so an unavailable config is a 503 rather than a
 * shrug.
 */
async function validateWriteDate(env: Env, date: string): Promise<Response | null> {
  if (!isValidDate(date)) {
    return json({ error: 'invalid date format, expected YYYY-MM-DD' }, 400);
  }
  const config = await loadConfig(env);
  if (!config) return json({ error: 'roster unavailable' }, 503);
  if (!config.meetingDates.includes(date)) {
    return json({ error: 'unknown meeting date' }, 400);
  }
  return null;
}

/**
 * Full gate for writes that *create* a row. Accepting an unvalidated name is
 * how a signup table fills with typos and last season's players.
 *
 * Deletes deliberately do not go through here — see clearSnack.
 *
 * The second `loadConfig` is free: `validateWriteDate` has just refreshed the
 * module-level cache, so this reads it rather than refetching.
 */
async function validateWrite(
  env: Env,
  { date, name, status }: WriteParams
): Promise<Response | null> {
  const invalid = await validateWriteDate(env, date);
  if (invalid) return invalid;

  const config = await loadConfig(env);
  if (!config) return json({ error: 'roster unavailable' }, 503);
  if (!config.people.includes(name)) {
    return json({ error: 'unknown person' }, 400);
  }
  if ((status ?? '').length > MAX_STATUS_LENGTH) {
    return json({ error: 'status too long' }, 400);
  }
  return null;
}

export async function putRsvp(env: Env, params: WriteParams): Promise<Response> {
  const invalid = await validateWrite(env, params);
  if (invalid) return invalid;

  await env.DB.prepare(
    `INSERT INTO signups (meeting_date, person, kind, value, updated_at)
     VALUES (?, ?, 'rsvp', ?, ?)
     ON CONFLICT (meeting_date, person, kind)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(params.date, params.name, params.status ?? '', new Date().toISOString())
    .run();

  return json({ ok: true });
}

/**
 * Snack duty is one person per meeting. Clearing and inserting go in a single
 * batch so there is never a moment with two assignees or none.
 */
export async function putSnack(env: Env, params: WriteParams): Promise<Response> {
  const invalid = await validateWrite(env, params);
  if (invalid) return invalid;

  await env.DB.batch([
    env.DB.prepare("DELETE FROM signups WHERE meeting_date = ? AND kind = 'snack'").bind(
      params.date
    ),
    env.DB.prepare(
      `INSERT INTO signups (meeting_date, person, kind, value, updated_at)
       VALUES (?, ?, 'snack', '1', ?)`
    ).bind(params.date, params.name, new Date().toISOString()),
  ]);

  return json({ ok: true });
}

/**
 * Clearing is validated on the date only, not the roster.
 *
 * A snack row survives its assignee leaving the roster mid-season: getSignups
 * still reports it, but the name is no longer in `config.people`, so a
 * roster-gated delete would 400 with 'unknown person' and the row could never
 * be cleared through the UI. The DELETE is already scoped to
 * meeting_date + person + kind, so a name that means nothing is a no-op rather
 * than a risk. putRsvp and putSnack, which create rows, stay roster-gated.
 */
export async function clearSnack(env: Env, params: WriteParams): Promise<Response> {
  const invalid = await validateWriteDate(env, params.date);
  if (invalid) return invalid;

  await env.DB.prepare(
    "DELETE FROM signups WHERE meeting_date = ? AND person = ? AND kind = 'snack'"
  )
    .bind(params.date, params.name)
    .run();

  return json({ ok: true });
}
