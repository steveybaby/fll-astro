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

/**
 * Every read is bounded. A flaky mobile connection can leave a request hanging
 * with no TCP reset, and a `fetch` that never settles means the callers' catch
 * branches — the ones that fall back to the localStorage cache — never run and
 * the component spins forever.
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * GET + parse, bounded by `timeoutMs`.
 *
 * The timer both aborts the underlying request and rejects the returned
 * promise. Rejecting independently matters: an abort only settles a fetch that
 * honours the signal, and the point of this is to guarantee the caller hears
 * back either way.
 *
 * The timeout covers reading the body as well as the response head, so a
 * response that stalls mid-stream is caught too.
 */
async function requestJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Signups request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const request = (async () => {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  })();

  try {
    return await Promise.race([request, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A timeout rejects the *shared* promise, which is what we want: `coalesce`'s
 * `.finally` fires on rejection as well as fulfilment, so the map entry is
 * evicted and the next caller starts a clean request. Both callers of a
 * coalesced read see the same failure rather than one of them being stranded.
 * The bound is set by whichever caller started the request.
 */
function fetchMeeting(date: string, timeoutMs: number): Promise<SignupsResponse> {
  return coalesce(date, () => {
    const url = new URL('/signups', SIGNUP_API_URL);
    url.searchParams.set('date', date);
    return requestJson<SignupsResponse>(url.toString(), timeoutMs);
  });
}

/** Bulk counterpart of `fetchMeeting`: every meeting in one request. */
function fetchAll(timeoutMs: number): Promise<AllSignupsResponse> {
  return coalesce(ALL_KEY, () => {
    const url = new URL('/signups/all', SIGNUP_API_URL);
    return requestJson<AllSignupsResponse>(url.toString(), timeoutMs);
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
 *
 * `timeoutMs` bounds the request; the season-wide grids pass a longer one.
 */
export async function getRSVPs(
  date?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<MeetingRecord[]> {
  if (date === undefined) {
    const data = await fetchAll(timeoutMs);
    return data.meetings.map((m) => ({ meetingDate: m.meetingDate, kids: m.rsvps }));
  }
  const data = await fetchMeeting(date, timeoutMs);
  return [{ meetingDate: data.meetingDate, kids: data.rsvps }];
}

/**
 * Callers expect the snack assignee expressed as a 🍰 status on a kid record,
 * which is how the sheet stored it. With no date, mirrors that mapping across
 * every meeting for the season-wide grid in snacks.astro.
 */
export async function getSnacks(
  date?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<MeetingRecord[]> {
  if (date === undefined) {
    const data = await fetchAll(timeoutMs);
    return data.meetings.map((m) => ({
      meetingDate: m.meetingDate,
      kids: m.rsvps.map((k) => ({
        name: k.name,
        status: k.name === m.snack ? '🍰' : '',
      })),
    }));
  }
  const data = await fetchMeeting(date, timeoutMs);
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
