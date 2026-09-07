/**
 * Immich integration for the photo pipeline.
 *
 * Headless companion to process-photos-r2.js: given an Immich server, an API
 * key and a date, it pulls the assets captured that afternoon so they can be
 * processed and uploaded exactly like locally-sourced photos.
 */

const PACIFIC_TZ = 'America/Los_Angeles';

/**
 * How many milliseconds a timezone is *ahead* of UTC at a given instant.
 * Positive east of UTC, negative west (Pacific is negative). Uses Intl so it
 * tracks PDT/PST automatically rather than hardcoding an offset.
 */
function tzOffsetMs(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(instant).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

/** Convert a Pacific wall-clock time to the matching UTC Date. */
function pacificWallClockToUtc(year, month, day, hour) {
  // First approximate as if the wall clock were UTC, then correct by the
  // zone's offset at that instant. noon/7pm are nowhere near the 02:00 DST
  // transition, so a single correction pass is exact here.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  return new Date(guess.getTime() - tzOffsetMs(guess, PACIFIC_TZ));
}

/**
 * For a `YYYY-MM-DD` date, return the UTC bounds of noon-7pm Pacific as ISO
 * strings suitable for Immich's takenAfter/takenBefore search filters.
 */
export function pacificWindowUtc(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Expected a YYYY-MM-DD date, got: ${dateStr}`);
  }
  const [, y, m, d] = match.map(Number);
  return {
    takenAfter: pacificWallClockToUtc(y, m, d, 12).toISOString(),
    takenBefore: pacificWallClockToUtc(y, m, d, 19).toISOString(),
  };
}

/** Trim a trailing slash so we can append `/api/...` cleanly. */
export function normalizeBaseUrl(url) {
  if (!url) throw new Error('IMMICH_URL is not set');
  return url.replace(/\/+$/, '');
}

/**
 * Fetch every asset captured within [takenAfter, takenBefore], following
 * Immich's search pagination. Returns the raw asset objects.
 */
export async function fetchAssetsInWindow({ baseUrl, apiKey, takenAfter, takenBefore }) {
  const items = [];
  let page = 1;

  for (;;) {
    const res = await fetch(`${baseUrl}/api/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ takenAfter, takenBefore, size: 1000, page }),
    });
    if (!res.ok) {
      throw new Error(
        `Immich search failed: ${res.status} ${res.statusText} — ${await res.text()}`
      );
    }
    const data = await res.json();
    const assets = data?.assets ?? {};
    items.push(...(assets.items ?? []));

    if (!assets.nextPage) break;
    page = Number(assets.nextPage);
  }

  return items;
}

/**
 * Decide how to fetch an asset.
 *
 * This box has neither ffmpeg nor a HEVC-capable libheif, so we lean on Immich's
 * server-side transcodes:
 *   - HEIC/HEIF image → its rendered JPEG preview (sharp can't decode HEVC).
 *   - video → its H.264 playback stream, plus a preview JPEG to use as the
 *     poster, so no local transcoding is needed.
 *   - anything else (normal JPEG/PNG) → the untouched original.
 *
 * Returns { path, outName } and, for videos, an extra `posterPath` to fetch the
 * poster image. `outName` normalises the extension (.jpg for previews, .mp4 for
 * playback).
 */
export function planAssetDownload(asset) {
  const name = asset.originalFileName || `${asset.id}`;
  const stem = name.replace(/\.[^.]+$/, '');
  const preview = `/api/assets/${asset.id}/thumbnail?size=preview`;

  if (asset.type === 'VIDEO') {
    return {
      path: `/api/assets/${asset.id}/video/playback`,
      outName: `${stem}.mp4`,
      posterPath: preview,
    };
  }
  if (asset.type === 'IMAGE' && /\.(heic|heif)$/i.test(name)) {
    return { path: preview, outName: `${stem}.jpg` };
  }
  return { path: `/api/assets/${asset.id}/original`, outName: name };
}

/** Download bytes from an Immich API path (relative to baseUrl). */
export async function downloadAsset({ baseUrl, apiKey, path }) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) {
    throw new Error(`Immich download failed for ${path}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
