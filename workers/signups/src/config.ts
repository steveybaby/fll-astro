import type { Env } from './http';

export interface SignupsConfig {
  season: string;
  people: string[];
  meetingDates: string[];
}

const TTL_MS = 5 * 60 * 1000;

let cached: SignupsConfig | null = null;
let cachedAt = 0;

/**
 * Strict YYYY-MM-DD. Deliberately rejects timestamp forms instead of coercing:
 * the previous backend returned "2026-08-16" from one endpoint and
 * "2026-08-16T07:00:00.000Z" from another, and every consumer grew its own
 * normalisation code to cope.
 */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * The roster lives in season.ts and is published by the site as a static file.
 * The Worker never keeps its own copy — a second copy would drift at the first
 * season reset and nobody would notice until a real signup was rejected.
 *
 * A stale cache is preferred to no config: rosters change a few times a year,
 * so serving the last known good one through a blip is safer than refusing
 * writes.
 */
export async function loadConfig(env: Env): Promise<SignupsConfig | null> {
  const fresh = cached && Date.now() - cachedAt < TTL_MS;
  if (fresh) return cached;

  try {
    const res = await fetch(env.CONFIG_URL, { cf: { cacheTtl: 60 } } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cached = (await res.json()) as SignupsConfig;
    cachedAt = Date.now();
    return cached;
  } catch {
    return cached; // stale if we have it, null if we never did
  }
}

/**
 * Test seams. `Object.assign` with an explicit intersection type rather than
 * assigning a property onto a plain function — TypeScript rejects the latter,
 * because `() => void` has no such property.
 *
 * `resetConfigCache()` clears the cache between cases; `.ttlExpire()` ages it
 * past its TTL without waiting five minutes.
 */
export const resetConfigCache: (() => void) & { ttlExpire: () => void } = Object.assign(
  function resetConfigCache(): void {
    cached = null;
    cachedAt = 0;
  },
  {
    ttlExpire(): void {
      cachedAt = 0;
    },
  }
);
