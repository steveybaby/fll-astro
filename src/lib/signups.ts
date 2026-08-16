/**
 * The single seam between the site and the signup backend.
 *
 * Today this talks to Google Apps Script. Spec 2 replaces the internals with a
 * Cloudflare Worker backed by D1; no page should need to change when it does.
 * The timeout and cache-busting logic below exists to mask Apps Script latency
 * (1-3s per call) and is expected to be deleted with that migration.
 *
 * Wire-format note: `google-apps-script.js` reads the optional list filter from
 * `e.parameter.meetingDate` for BOTH `get` and `getSnacks` — it never reads a
 * parameter named `date`. The `date` argument below is therefore sent on the
 * wire as `meetingDate`, which is what the callers were already doing.
 */

export const SIGNUP_API_URL =
  'https://script.google.com/macros/s/AKfycbwFpY_VgGndIStuh1UOu1wA--QXMDWjVLaiLAjqMDOO58x9dA2H4RkOJ8daCtyc8BNPfQ/exec';

export type SignupAction = 'get' | 'update' | 'getSnacks' | 'assignSnack' | 'removeSnack';

export interface KidRecord {
  name: string;
  status: string;
}

export interface MeetingRecord {
  meetingDate: string;
  kids: KidRecord[];
}

export function buildSignupUrl(
  action: SignupAction,
  params: Record<string, string> = {},
): string {
  const url = new URL(SIGNUP_API_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Matches the timeout the read call sites used before this file existed. */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * List reads: cache-busted, no-store, aborted after `timeoutMs`, and throwing on
 * a non-2xx response. Every previous call site did exactly this by hand.
 */
async function readList(
  action: SignupAction,
  params: Record<string, string> = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<MeetingRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = buildSignupUrl(action, { ...params, _cb: String(Date.now()) });
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return (await response.json()) as MeetingRecord[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Writes: a plain GET with no timeout, matching the previous call sites. A
 * non-2xx response resolves to `{ success: false }` rather than throwing, which
 * is how every caller already interpreted it. Network failures still reject.
 */
async function write(
  action: SignupAction,
  params: Record<string, string>,
): Promise<{ success: boolean }> {
  const response = await fetch(buildSignupUrl(action, params), {
    method: 'GET',
    redirect: 'follow',
  });
  if (!response.ok) return { success: false };
  return (await response.json()) as { success: boolean };
}

export const getRSVPs = (date?: string, timeoutMs?: number): Promise<MeetingRecord[]> =>
  readList('get', date ? { meetingDate: date } : {}, timeoutMs);

export const updateRSVP = (
  meetingDate: string,
  kidName: string,
  status: string,
): Promise<{ success: boolean }> => write('update', { meetingDate, kidName, status });

export const getSnacks = (date?: string, timeoutMs?: number): Promise<MeetingRecord[]> =>
  readList('getSnacks', date ? { meetingDate: date } : {}, timeoutMs);

export const assignSnack = (
  meetingDate: string,
  kidName: string,
): Promise<{ success: boolean }> => write('assignSnack', { meetingDate, kidName });

export const removeSnack = (
  meetingDate: string,
  kidName: string,
): Promise<{ success: boolean }> => write('removeSnack', { meetingDate, kidName });
