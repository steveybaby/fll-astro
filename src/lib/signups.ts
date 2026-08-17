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

/**
 * One in-flight request per meeting.
 *
 * A meeting page calls getRSVPs and getSnacks, which both need the same
 * response. Whichever arrives first starts the fetch; the second awaits the
 * same promise. Entries are dropped once settled and whenever that date is
 * written to, so a write is always followed by fresh data.
 */
const inFlight = new Map<string, Promise<SignupsResponse>>();

function fetchMeeting(date: string): Promise<SignupsResponse> {
  const existing = inFlight.get(date);
  if (existing) return existing;

  const url = new URL('/signups', SIGNUP_API_URL);
  url.searchParams.set('date', date);

  const promise = fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as SignupsResponse;
    })
    .finally(() => inFlight.delete(date));

  inFlight.set(date, promise);
  return promise;
}

function invalidate(date: string): void {
  inFlight.delete(date);
}

async function post(path: string, body: unknown): Promise<{ success: boolean }> {
  const response = await fetch(new URL(path, SIGNUP_API_URL).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { success: response.ok };
}

export async function getRSVPs(date: string): Promise<MeetingRecord[]> {
  const data = await fetchMeeting(date);
  return [{ meetingDate: data.meetingDate, kids: data.rsvps }];
}

/**
 * Callers expect the snack assignee expressed as a 🍰 status on a kid record,
 * which is how the sheet stored it.
 */
export async function getSnacks(date: string): Promise<MeetingRecord[]> {
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
