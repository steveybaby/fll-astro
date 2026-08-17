#!/usr/bin/env node
/**
 * One-off: copy current-season signups from the Apps Script backend into the
 * Worker. Ten values as of writing.
 *
 * An unknown person is a hard error, not a skip. The old sheet carries three
 * players from the 2025-26 team (Asher, Kai, Jeremiah); none appears in any
 * current-season row, but silently skipping is exactly how a real signup would
 * go missing unnoticed.
 */

const APPS_SCRIPT =
  'https://script.google.com/macros/s/AKfycbwFpY_VgGndIStuh1UOu1wA--QXMDWjVLaiLAjqMDOO58x9dA2H4RkOJ8daCtyc8BNPfQ/exec';

const WORKER = process.env.WORKER_URL;
const CONFIG_URL = process.env.CONFIG_URL || 'https://fll.sharpers.com/signups-config.json';

if (!WORKER) {
  console.error('Set WORKER_URL, e.g. WORKER_URL=https://fll-signups.x.workers.dev');
  process.exit(1);
}

// The two Apps Script endpoints disagree about date format: `get` returns bare
// YYYY-MM-DD, `getSnacks` returns a UTC timestamp. Both represent midnight
// Pacific, and the Pacific offset is 7-8 hours, so the UTC calendar day always
// matches the local one and a plain slice is safe. Ending this disagreement is
// half the point of the migration.
const dateOnly = (v) => String(v).slice(0, 10);

async function main() {
  const config = await (await fetch(CONFIG_URL)).json();
  const people = new Set(config.people);
  const dates = new Set(config.meetingDates);

  const [rsvps, snacks] = await Promise.all([
    (await fetch(`${APPS_SCRIPT}?action=get`)).json(),
    (await fetch(`${APPS_SCRIPT}?action=getSnacks`)).json(),
  ]);

  const problems = [];
  const writes = [];

  for (const row of rsvps) {
    const date = dateOnly(row.meetingDate);
    if (!dates.has(date)) continue; // previous season
    for (const kid of row.kids) {
      if (!kid.status) continue;
      if (!people.has(kid.name)) {
        problems.push(`rsvp ${date}: unknown person "${kid.name}"`);
        continue;
      }
      writes.push({ kind: 'rsvp', date, name: kid.name, status: kid.status });
    }
  }

  for (const row of snacks) {
    const date = dateOnly(row.meetingDate);
    if (!dates.has(date)) continue;
    for (const kid of row.kids) {
      if (!kid.status) continue;
      if (!people.has(kid.name)) {
        problems.push(`snack ${date}: unknown person "${kid.name}"`);
        continue;
      }
      writes.push({ kind: 'snack', date, name: kid.name });
    }
  }

  if (problems.length) {
    console.error('Refusing to migrate — unknown names found:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  console.log(`Migrating ${writes.length} values...`);
  for (const w of writes) {
    const res =
      w.kind === 'rsvp'
        ? await fetch(`${WORKER}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: w.date, name: w.name, status: w.status }),
          })
        : await fetch(`${WORKER}/snack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: w.date, name: w.name }),
          });
    if (!res.ok) {
      console.error(`FAILED ${w.kind} ${w.date} ${w.name}: HTTP ${res.status}`);
      process.exit(1);
    }
    console.log(`  ok ${w.kind} ${w.date} ${w.name}${w.status ? ' ' + w.status : ''}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
