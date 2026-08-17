/**
 * The single seam between the site and the signup backend.
 *
 * Talks to the Cloudflare Worker in workers/signups. The previous Apps Script
 * backend took ~2.25s per call and returned all 32 meetings on every request;
 * this fetches one meeting.
 *
 * The five exported functions keep the signatures their callers already use, so
 * RSVPComponent, SnackDutyComponent, rsvps.astro, coach_rsvps.astro and
 * snacks.astro did not change when the backend did.
 */

export const SIGNUP_API_URL = 'https://fll-signups.fll-sharpers.workers.dev';

export interface KidRecord {
  name: string;
  status: string;
}

export interface MeetingRecord {
  meetingDate: string;
  kids: KidRecord[];
}

interface SignupsResponse {
  meetingDate: string;
  rsvps: KidRecord[];
  snack: string | null;
}

interface AllSignupsResponse {
  meetings: SignupsResponse[];
}

/**
 * Key for the bulk ("every meeting") request in the in-flight/cache map below.
 *
 * Real entries are keyed by meeting date, always a strict `YYYY-MM-DD` string
 * (see `isValidDate` on the Worker side). This key is not a calendar date at
 * all, so it can never collide with one.
 */
const ALL_KEY = '*';

/**
 * One in-flight request per key — either a meeting date or ALL_KEY.
 *
 * A meeting page calls getRSVPs and getSnacks, which both need the same
 * response. Whichever arrives first starts the fetch; the second awaits the
 * same promise. Entries are dropped once settled and whenever that date (or
 * everything, via ALL_KEY) is written to, so a write is always followed by
 * fresh data.
 *
 * Values are `unknown` rather than a single response type because this map
 * holds both per-meeting and bulk responses; each caller casts back to the
 * type it knows it asked for via `coalesce`'s type parameter.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent requests for the same key and self-evicts.
 *
 * The `.finally` only deletes the map entry if it still holds *this*
 * promise. Without that check, a write's `invalidate()` racing a fresh read
 * could delete the new read's live promise out from under it the moment the
 * old one settles.
 */
function coalesce<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = run().finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

function fetchMeeting(date: string): Promise<SignupsResponse> {
  return coalesce(date, async () => {
    const url = new URL('/signups', SIGNUP_API_URL);
    url.searchParams.set('date', date);

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as SignupsResponse;
  });
}

/** Bulk counterpart of `fetchMeeting`: every meeting in one request. */
function fetchAll(): Promise<AllSignupsResponse> {
  return coalesce(ALL_KEY, async () => {
    const url = new URL('/signups/all', SIGNUP_API_URL);

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as AllSignupsResponse;
  });
}

/** A write invalidates both its own meeting and the season-wide bulk entry. */
function invalidate(date: string): void {
  inFlight.delete(date);
  inFlight.delete(ALL_KEY);
}

async function post(path: string, body: unknown): Promise<{ success: boolean }> {
  const response = await fetch(new URL(path, SIGNUP_API_URL).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { success: response.ok };
}

/**
 * With a date, returns that one meeting. With no date, returns every meeting
 * in the season — the old Apps Script backend's "no date" read mode, still
 * relied on by the season-wide grids in rsvps.astro and coach_rsvps.astro.
 */
export async function getRSVPs(date?: string): Promise<MeetingRecord[]> {
  if (date === undefined) {
    const data = await fetchAll();
    return data.meetings.map((m) => ({ meetingDate: m.meetingDate, kids: m.rsvps }));
  }
  const data = await fetchMeeting(date);
  return [{ meetingDate: data.meetingDate, kids: data.rsvps }];
}

/**
 * Callers expect the snack assignee expressed as a 🍰 status on a kid record,
 * which is how the sheet stored it. With no date, mirrors that mapping across
 * every meeting for the season-wide grid in snacks.astro.
 */
export async function getSnacks(date?: string): Promise<MeetingRecord[]> {
  if (date === undefined) {
    const data = await fetchAll();
    return data.meetings.map((m) => ({
      meetingDate: m.meetingDate,
      kids: m.rsvps.map((k) => ({
        name: k.name,
        status: k.name === m.snack ? '🍰' : '',
      })),
    }));
  }
  const data = await fetchMeeting(date);
  return [
    {
      meetingDate: data.meetingDate,
      kids: data.rsvps.map((k) => ({
        name: k.name,
        status: k.name === data.snack ? '🍰' : '',
      })),
    },
  ];
}

export async function updateRSVP(
  meetingDate: string,
  kidName: string,
  status: string
): Promise<{ success: boolean }> {
  invalidate(meetingDate);
  return post('/rsvp', { date: meetingDate, name: kidName, status });
}

export async function assignSnack(
  meetingDate: string,
  kidName: string
): Promise<{ success: boolean }> {
  invalidate(meetingDate);
  return post('/snack', { date: meetingDate, name: kidName });
}

export async function removeSnack(
  meetingDate: string,
  kidName: string
): Promise<{ success: boolean }> {
  invalidate(meetingDate);
  const url = new URL('/snack', SIGNUP_API_URL);
  url.searchParams.set('date', meetingDate);
  url.searchParams.set('name', kidName);
  const response = await fetch(url.toString(), { method: 'DELETE' });
  return { success: response.ok };
}

/** Test seam: clears the in-flight map between cases. */
export function resetSignupCache(): void {
  inFlight.clear();
}
