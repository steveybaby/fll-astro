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
