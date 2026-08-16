// One-shot export of 2025-26 RSVP and snack records from Apps Script to static JSON.
// After this runs, the JSON is authoritative and the Sheet may be retired.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const API =
  'https://script.google.com/macros/s/AKfycbwFpY_VgGndIStuh1UOu1wA--QXMDWjVLaiLAjqMDOO58x9dA2H4RkOJ8daCtyc8BNPfQ/exec';
const OUT = 'src/data/2025-26-history.json';

async function get(action) {
  const url = new URL(API);
  url.searchParams.set('action', action);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${action} failed: HTTP ${res.status}`);
  return res.json();
}

const [rsvps, snacks] = await Promise.all([get('get'), get('getSnacks')]);

// Keep only 2025-26 season records (Aug 2025 through Dec 2025).
const inSeason = (r) => r.meetingDate >= '2025-08-01' && r.meetingDate <= '2025-12-31';
const normalize = (rows) =>
  rows
    .map((r) => ({
      meetingDate: r.meetingDate.includes('T') ? r.meetingDate.split('T')[0] : r.meetingDate,
      kids: r.kids ?? [],
    }))
    .filter(inSeason)
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

const payload = {
  season: '2025-26',
  exportedAt: new Date().toISOString(),
  rsvps: normalize(rsvps),
  snacks: normalize(snacks),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${OUT}: ${payload.rsvps.length} rsvp rows, ${payload.snacks.length} snack rows`);
