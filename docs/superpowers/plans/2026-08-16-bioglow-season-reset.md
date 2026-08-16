# BIOGLOW Season Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the 2025-26 UNEARTHED season under `/2025/`, reset the site for the 2026-27 BIOGLOW season, and verify the result.

**Architecture:** Season identity moves from scattered hardcoded values into a single `src/config/season.ts`. Content collections gain a `season` field; a shared `getSeasonContent()` helper replaces per-page date filtering. Archive routes reuse live components with a season prop, and a `data-season` attribute restores the 2025 palette. Signup API calls consolidate into `src/lib/signups.ts` as the seam for a later backend migration.

**Tech Stack:** Astro 5, TypeScript, Vitest (new), CSS custom properties, Cloudflare R2, Google Apps Script (unchanged this spec).

**Spec:** [`docs/superpowers/specs/2026-08-16-bioglow-season-reset-design.md`](../specs/2026-08-16-bioglow-season-reset-design.md)

## Global Constraints

- Node 20 (matches `.github/workflows` CI).
- `npm run build` must pass at the end of every task.
- `npm run check` has a **pre-existing baseline of 91 errors** (verified at commit `28e768f`,
  before any work on this branch). The rule is: do not exceed 91. Fixing pre-existing errors
  is out of scope — do not attempt it, and do not treat the baseline as a task failure.
  Check the count with:
  `npm run check 2>&1 | grep -oE '^- [0-9]+ errors' | head -1`
- Never change signup request/response behavior in this spec — the Apps Script backend is untouched. Backend replacement is spec 2.
- Team name is `Bio-Llamas` (placeholder) and must only ever be read from `season.ts`.
- Current season id is the string `"2026-27"`; archived is `"2025-26"`.
- Archive URL prefix is `/2025/` exactly.
- Archived palette accent is the original `#dc2626`, NOT the BIOGLOW signal red `#EE2027`.
- Meeting default: Sundays `14:00`, duration `2`, location `188 Calle La Montana, Moraga, CA, 94556`.
- Roster order is fixed: Jasper, Ethan, Luca, Ishaan, Hudson.
- All layouts must derive column counts from `roster.length` — never hardcode 5 or 6.

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Create — test runner config |
| `src/config/season.ts` | Create — season + roster source of truth |
| `src/utils/season.ts` | Create — `getSeasonContent()` filtering helper |
| `src/lib/signups.ts` | Create — the five signup API operations |
| `src/data/2025-26-history.json` | Create — frozen RSVP/snack records |
| `src/utils/calendar.ts` | Modify — fix DST calculation |
| `src/content/config.ts` | Modify — add `season` field |
| `src/styles/global.css` | Modify — BIOGLOW palette + `data-season` override |
| `src/pages/2025/*` | Create — archive routes (props only, no markup) |
| `src/content/meetings/2026-*.md` | Create — 21 new meeting files |
| `src/components/RSVP.astro` | **Delete** — dead code, stale endpoint |

---

## Task 1: Test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Test: `src/utils/__tests__/meeting-time.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs Vitest; `describe`/`it`/`expect` available in `src/**/__tests__/*.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest@^2.1.0
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a test against existing behavior**

Create `src/utils/__tests__/meeting-time.test.ts`. `formatMeetingTime` already exists in `src/utils/meeting-time.ts` and is unchanged by this plan — this test proves the harness works.

```ts
import { describe, it, expect } from 'vitest';
import { formatMeetingTime } from '../meeting-time';

describe('formatMeetingTime', () => {
  it('formats an afternoon start time', () => {
    expect(formatMeetingTime('14:00')).toBe('2pm');
  });

  it('includes minutes when non-zero', () => {
    expect(formatMeetingTime('15:30')).toBe('3:30pm');
  });

  it('appends singular hour for a one-hour meeting', () => {
    expect(formatMeetingTime('14:00', 1)).toBe('2pm (1 hour)');
  });

  it('appends plural hours otherwise', () => {
    expect(formatMeetingTime('14:00', 2)).toBe('2pm (2 hours)');
  });

  it('returns empty string when startTime is missing', () => {
    expect(formatMeetingTime(undefined, 2)).toBe('');
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/utils/__tests__/meeting-time.test.ts
git commit -m "test: add vitest harness for pure utility logic"
```

---

## Task 2: Freeze 2025-26 signup history

**Files:**
- Create: `scripts/export-history.js`
- Create: `src/data/2025-26-history.json`

**Interfaces:**
- Consumes: nothing
- Produces: `src/data/2025-26-history.json` shaped as
  `{ season: "2025-26", exportedAt: string, rsvps: MeetingRecord[], snacks: MeetingRecord[] }`
  where `MeetingRecord = { meetingDate: string; kids: { name: string; status: string }[] }`

**Do this task first.** It is the only step depending on a live external service that spec 2 decommissions. If the Google Sheet needs edits, make them before running this.

- [ ] **Step 1: Write the export script**

Create `scripts/export-history.js`:

```js
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
```

- [ ] **Step 2: Run the export**

Run: `node scripts/export-history.js`
Expected: `Wrote src/data/2025-26-history.json: N rsvp rows, M snack rows` with both N and M greater than zero.

If either count is zero, STOP and report — the Apps Script deployment may be down or the response shape may differ. Do not commit an empty archive.

- [ ] **Step 3: Verify the shape**

Run: `node -e "const d=require('./src/data/2025-26-history.json'); console.log(d.season, d.rsvps.length, d.snacks.length); console.log(JSON.stringify(d.rsvps[0],null,2))"`
Expected: season `2025-26`, non-zero counts, and a first record with `meetingDate` in `YYYY-MM-DD` form plus a `kids` array.

- [ ] **Step 4: Commit**

```bash
git add scripts/export-history.js src/data/2025-26-history.json
git commit -m "feat: freeze 2025-26 signup history to static JSON"
```

---

## Task 3: Season configuration and roster

**Files:**
- Create: `src/config/season.ts`
- Test: `src/config/__tests__/season.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `CURRENT_SEASON: string` — `"2026-27"`
  - `ARCHIVED_SEASONS: string[]` — `["2025-26"]`
  - `SEASONS: Record<string, Season>`
  - `getSeason(id: string): Season`
  - `getCurrentSeason(): Season`
  - `Season = { id, challenge, teamName, archived, archivePath, roster, defaults }`
  - `RosterMember = { name: string; initials: string; returning: boolean }`
  - `defaults = { startTime: string; duration: number; location: string }`

- [ ] **Step 1: Write the failing test**

Create `src/config/__tests__/season.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CURRENT_SEASON, SEASONS, getSeason, getCurrentSeason } from '../season';

describe('season config', () => {
  it('current season is 2026-27 BIOGLOW', () => {
    expect(CURRENT_SEASON).toBe('2026-27');
    expect(getCurrentSeason().challenge).toBe('BIOGLOW');
  });

  it('the current season is not archived', () => {
    expect(getCurrentSeason().archived).toBe(false);
  });

  it('2025-26 is archived at /2025', () => {
    const prev = getSeason('2025-26');
    expect(prev.archived).toBe(true);
    expect(prev.challenge).toBe('UNEARTHED');
    expect(prev.archivePath).toBe('/2025');
  });

  it('roster is five members in fixed order', () => {
    expect(getCurrentSeason().roster.map((m) => m.name)).toEqual([
      'Jasper',
      'Ethan',
      'Luca',
      'Ishaan',
      'Hudson',
    ]);
  });

  it('every roster member has unique initials', () => {
    const initials = getCurrentSeason().roster.map((m) => m.initials);
    expect(new Set(initials).size).toBe(initials.length);
  });

  it('marks returning versus new members', () => {
    const byName = Object.fromEntries(getCurrentSeason().roster.map((m) => [m.name, m.returning]));
    expect(byName).toEqual({
      Jasper: true,
      Ethan: true,
      Luca: true,
      Ishaan: false,
      Hudson: false,
    });
  });

  it('meeting defaults are Sunday 2pm for two hours in Moraga', () => {
    expect(getCurrentSeason().defaults).toEqual({
      startTime: '14:00',
      duration: 2,
      location: '188 Calle La Montana, Moraga, CA, 94556',
    });
  });

  it('getSeason throws on an unknown id', () => {
    expect(() => getSeason('1999-00')).toThrow();
  });

  it('every season in SEASONS is keyed by its own id', () => {
    for (const [key, season] of Object.entries(SEASONS)) {
      expect(season.id).toBe(key);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- season`
Expected: FAIL — cannot resolve `../season`.

- [ ] **Step 3: Create `src/config/season.ts`**

```ts
export interface RosterMember {
  name: string;
  initials: string;
  returning: boolean;
}

export interface SeasonDefaults {
  startTime: string;
  duration: number;
  location: string;
}

export interface Season {
  id: string;
  challenge: string;
  teamName: string;
  archived: boolean;
  archivePath: string | null;
  roster: RosterMember[];
  defaults: SeasonDefaults;
}

export const CURRENT_SEASON = '2026-27';

const MORAGA = '188 Calle La Montana, Moraga, CA, 94556';

export const SEASONS: Record<string, Season> = {
  '2026-27': {
    id: '2026-27',
    challenge: 'BIOGLOW',
    // Placeholder name. This is the only place the team name is defined.
    teamName: 'Bio-Llamas',
    archived: false,
    archivePath: null,
    roster: [
      { name: 'Jasper', initials: 'JH', returning: true },
      { name: 'Ethan', initials: 'EM', returning: true },
      { name: 'Luca', initials: 'LS', returning: true },
      { name: 'Ishaan', initials: 'IA', returning: false },
      { name: 'Hudson', initials: 'HH', returning: false },
    ],
    defaults: { startTime: '14:00', duration: 2, location: MORAGA },
  },
  '2025-26': {
    id: '2025-26',
    challenge: 'UNEARTHED',
    teamName: 'Looting Llamas',
    archived: true,
    archivePath: '/2025',
    roster: [
      { name: 'Jasper', initials: 'JH', returning: false },
      { name: 'Asher', initials: 'AO', returning: false },
      { name: 'Kai', initials: 'KP', returning: false },
      { name: 'Jeremiah', initials: 'JR', returning: false },
      { name: 'Luca', initials: 'LS', returning: false },
      { name: 'Ethan', initials: 'EM', returning: false },
    ],
    defaults: { startTime: '15:30', duration: 2.5, location: MORAGA },
  },
};

export const ARCHIVED_SEASONS = Object.values(SEASONS)
  .filter((s) => s.archived)
  .map((s) => s.id);

export function getSeason(id: string): Season {
  const season = SEASONS[id];
  if (!season) throw new Error(`Unknown season: ${id}`);
  return season;
}

export function getCurrentSeason(): Season {
  return getSeason(CURRENT_SEASON);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- season`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/config/season.ts src/config/__tests__/season.test.ts
git commit -m "feat: add season config as single source of truth for roster and identity"
```

---

## Task 4: Fix the DST calculation

**Files:**
- Modify: `src/utils/calendar.ts:65`
- Test: `src/utils/__tests__/calendar.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `getMeetingDateTime` unchanged in signature; corrected DST boundary

**Background:** `src/utils/calendar.ts:65` computes the second Sunday in March without a `% 7`, while line 67 computes the first Sunday in November with one. When March 8 falls on a Sunday the March branch adds 7 days and lands a week late. 2026 is such a year (March 8, 2026 is a Sunday). No meeting in either season falls in the broken window, so this is latent rather than active — fix it anyway, it is one character.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getMeetingDateTime } from '../calendar';

// Helper: the UTC hour a Pacific-local meeting time maps to.
const utcHour = (isoDate: string, startTime: string) =>
  getMeetingDateTime(new Date(`${isoDate}T00:00:00Z`), startTime, 2).date.getUTCHours();

describe('getMeetingDateTime DST handling', () => {
  it('uses PDT (UTC-7) for a summer meeting', () => {
    // 2026-08-16 14:00 PDT === 21:00 UTC
    expect(utcHour('2026-08-16', '14:00')).toBe(21);
  });

  it('uses PST (UTC-8) for a December meeting', () => {
    // 2026-12-13 14:00 PST === 22:00 UTC
    expect(utcHour('2026-12-13', '14:00')).toBe(22);
  });

  it('uses PST on 2026-11-01, the day DST ends', () => {
    // DST ends 2am local on 2026-11-01; a 2pm meeting is after the switch.
    expect(utcHour('2026-11-01', '14:00')).toBe(22);
  });

  it('uses PDT on 2026-10-25, the Sunday before DST ends', () => {
    expect(utcHour('2026-10-25', '14:00')).toBe(21);
  });

  it('treats 2026-03-08 as PDT (second Sunday in March)', () => {
    // Regression: the buggy version computed DST start as 2026-03-15,
    // so this date was wrongly treated as PST.
    expect(utcHour('2026-03-08', '14:00')).toBe(21);
  });

  it('treats 2026-03-07 as PST (day before DST starts)', () => {
    expect(utcHour('2026-03-07', '14:00')).toBe(22);
  });

  it('preserves the explicit duration', () => {
    const { duration } = getMeetingDateTime(new Date('2026-08-16T00:00:00Z'), '14:00', 2);
    expect(duration).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- calendar`
Expected: FAIL on `treats 2026-03-08 as PDT` — receives 22, expected 21. The other six pass.

- [ ] **Step 3: Apply the fix**

In `src/utils/calendar.ts`, change line 65 from:

```ts
  const march2ndSunday = new Date(march2nd.getTime() + (7 - march2nd.getUTCDay()) * 24 * 60 * 60 * 1000);
```

to:

```ts
  const march2ndSunday = new Date(march2nd.getTime() + ((7 - march2nd.getUTCDay()) % 7) * 24 * 60 * 60 * 1000);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- calendar`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calendar.ts src/utils/__tests__/calendar.test.ts
git commit -m "fix: correct second-Sunday-in-March DST calculation

Missing modulo meant that when March 8 falls on a Sunday the DST start
was computed a week late. 2026 is such a year."
```

---

## Task 5: Add `season` to content collections and backfill

**Files:**
- Modify: `src/content/config.ts`
- Modify: all 27 files in `src/content/meetings/`
- Modify: `src/content/newsletter/lego-meeting-week2.mdx`
- Modify: `src/content/blog/2025-08-10-welcome-to-my-site.md`

**Interfaces:**
- Consumes: `CURRENT_SEASON` from `src/config/season.ts`
- Produces: every entry in `meetings`, `newsletter`, and `blog` exposes `data.season: string`

- [ ] **Step 1: Add the field to all three schemas**

In `src/content/config.ts`, add this import at the top:

```ts
import { CURRENT_SEASON } from '../config/season';
```

Then add to each of the three `z.object({...})` schema bodies (`blog`, `meetings`, `newsletter`):

```ts
    season: z.string().default(CURRENT_SEASON),
```

- [ ] **Step 2: Backfill existing content with the 2025-26 season**

All existing content predates the reset and belongs to the archived season. Run:

```bash
for f in src/content/meetings/*.md src/content/newsletter/*.mdx src/content/blog/*.md; do
  grep -q '^season:' "$f" || perl -i -pe 'print "season: \"2025-26\"\n" if $. == 2 && !$done++' "$f"
done
```

- [ ] **Step 3: Verify every file got the field**

Run:

```bash
total=$(ls src/content/meetings/*.md src/content/newsletter/*.mdx src/content/blog/*.md | wc -l)
tagged=$(grep -l '^season: "2025-26"' src/content/meetings/*.md src/content/newsletter/*.mdx src/content/blog/*.md | wc -l)
echo "tagged $tagged of $total"
```

Expected: `tagged 30 of 30`.

- [ ] **Step 4: Verify the frontmatter is still valid**

Run: `npm run build`
Expected: build succeeds. A YAML error here means the `season:` line landed outside the frontmatter block — inspect the offending file and fix by hand.

- [ ] **Step 5: Commit**

```bash
git add src/content/
git commit -m "feat: add season field to content collections and backfill 2025-26"
```

---

## Task 6: Season filtering helper

**Files:**
- Create: `src/utils/season.ts`
- Test: `src/utils/__tests__/season-filter.test.ts`

**Interfaces:**
- Consumes: `CURRENT_SEASON` from `src/config/season.ts`
- Produces:
  - `filterBySeason<T extends { data: { season: string } }>(entries: T[], season?: string): T[]`
  - `getSeasonContent(collection: string, season?: string): Promise<any[]>` — wraps `getCollection`
  - Both default to `CURRENT_SEASON` when `season` is omitted.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/season-filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterBySeason } from '../season';

const entry = (id: string, season: string) => ({ id, data: { season } });

const entries = [
  entry('a', '2025-26'),
  entry('b', '2026-27'),
  entry('c', '2025-26'),
  entry('d', '2026-27'),
];

describe('filterBySeason', () => {
  it('defaults to the current season', () => {
    expect(filterBySeason(entries).map((e) => e.id)).toEqual(['b', 'd']);
  });

  it('filters to an explicit season', () => {
    expect(filterBySeason(entries, '2025-26').map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('returns empty for a season with no content', () => {
    expect(filterBySeason(entries, '2099-00')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const copy = [...entries];
    filterBySeason(entries, '2025-26');
    expect(entries).toEqual(copy);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- season-filter`
Expected: FAIL — `filterBySeason` is not exported.

- [ ] **Step 3: Create `src/utils/season.ts`**

```ts
import { getCollection } from 'astro:content';
import { CURRENT_SEASON } from '../config/season';

/**
 * Filter already-loaded collection entries to a single season.
 * Kept separate from getSeasonContent so it is testable without Astro's
 * content runtime.
 */
export function filterBySeason<T extends { data: { season: string } }>(
  entries: T[],
  season: string = CURRENT_SEASON
): T[] {
  return entries.filter((entry) => entry.data.season === season);
}

/** Load one collection, filtered to a season. Defaults to the current season. */
export async function getSeasonContent<C extends CollectionKey>(
  collection: C,
  season: string = CURRENT_SEASON
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  return filterBySeason(entries, season);
}
```

The generic matters: typing `collection` as `any` collapses `getCollection`'s return to `any`
and silently disables field-level type checking at every call site. `CollectionKey` is the
exported form of `keyof AnyEntryMap` (`AnyEntryMap` itself is not exported), so the import is:

```ts
import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- season-filter`
Expected: PASS, 4 tests.

- [ ] **Step 5: Repoint the live listing pages**

In each file below, replace the bare `await getCollection('<name>')` with `await getSeasonContent('<name>')` and add the import `import { getSeasonContent } from '../utils/season';` (adjust the relative depth per file):

- `src/pages/index.astro:8-13` — all three collections
- `src/pages/calendar.astro`
- `src/pages/snacks.astro:7`
- `src/pages/rsvps.astro`
- `src/pages/coach_rsvps.astro`
- `src/pages/meeting-plans.astro:6`
- `src/pages/newsletters.astro`
- `src/pages/calendar.ics.ts`
- `src/components/NextMeetingBanner.astro` — renders on the homepage
- `src/components/Sidebar.astro`

`src/pages/photos.astro` needs no change: it is a static informational page with no content
query at all.

**The blog pages do not use content collections.** `blog.astro`, `categories.astro`,
`rss.xml.js`, `search.json.js`, `blog/[...slug].astro`, and `categories/[category].astro`
all read markdown directly with `import.meta.glob`, so the `season` schema field has no
effect on them. They cannot be "repointed" — instead, filter their glob results, which
expose frontmatter directly:

```js
import { CURRENT_SEASON } from '../config/season';

// eager globs (blog.astro, categories.astro, rss.xml.js, and the two dynamic routes)
const inSeason = ([, post]) => post.frontmatter.season === CURRENT_SEASON;
const posts = Object.entries(import.meta.glob('../content/blog/*.md', { eager: true }))
  .filter(inSeason);
```

`search.json.js` uses a lazy glob, so its filter goes after the per-path `await`:

```js
const post = await posts[path]();
if (post.frontmatter.season !== CURRENT_SEASON) continue;
```

The archived equivalents under `/2025/` (Task 7) filter on `'2025-26'` the same way.

Leave `src/pages/meetings/[...slug].astro`, `src/pages/blog/[...slug].astro`, and `src/pages/newsletters/[...slug].astro` on unfiltered `getCollection` for now — Task 7 changes how those generate paths.

- [ ] **Step 6: Verify the live site shows no 2025 content**

Run: `npm run build`
Then: `grep -rl "2025-" dist/index.html || echo "no 2025 content on homepage"`
Expected: the homepage no longer lists 2025 meetings. The site will look sparse until Task 11 adds meeting files — that is expected.

- [ ] **Step 7: Commit**

```bash
git add src/utils/season.ts src/utils/__tests__/season-filter.test.ts src/pages/
git commit -m "feat: filter listing pages to the current season"
```

---

## Task 7: Archive routes under `/2025/`

**Files:**
- Modify: `src/pages/meetings/[...slug].astro`
- Create: `src/pages/2025/index.astro`
- Create: `src/pages/2025/meetings/[...slug].astro`
- Create: `src/pages/2025/calendar.astro`
- Create: `src/pages/2025/newsletters/index.astro`
- Create: `src/pages/2025/newsletters/[...slug].astro`
- Create: `src/pages/2025/blog/index.astro`
- Create: `src/pages/2025/blog/[...slug].astro`

**Interfaces:**
- Consumes: `getSeasonContent`, `filterBySeason`, `getSeason` from Tasks 3 and 6
- Produces: every archived entry reachable at `/2025/<type>/<slug>`

**Constraint:** No archive route may contain page markup. Each is a thin wrapper that loads season-filtered content and renders the same components the live pages use. If a live page's body is inline markup rather than a component, extract it to `src/components/` first and have both routes render it.

- [ ] **Step 1: Restrict live dynamic routes to the current season**

In `src/pages/meetings/[...slug].astro`, change `getStaticPaths` so it only emits current-season meetings:

```ts
export async function getStaticPaths() {
  const meetings = await getSeasonContent('meetings');
  return meetings.map((meeting) => ({
    params: { slug: meeting.slug },
    props: { meeting, season: CURRENT_SEASON },
  }));
}
```

Add the imports:

```ts
import { getSeasonContent } from '../../utils/season';
import { CURRENT_SEASON } from '../../config/season';
```

Apply the same change to `src/pages/blog/[...slug].astro` and `src/pages/newsletters/[...slug].astro`.

- [ ] **Step 2: Create the archived meeting route**

Create `src/pages/2025/meetings/[...slug].astro`. It mirrors Step 1 but pins the season and prefixes the path:

```astro
---
import { getSeasonContent } from '../../../utils/season';
import MeetingDetail from '../../../components/MeetingDetail.astro';

const ARCHIVED = '2025-26';

export async function getStaticPaths() {
  const meetings = await getSeasonContent('meetings', '2025-26');
  return meetings.map((meeting) => ({
    params: { slug: meeting.slug },
    props: { meeting },
  }));
}

const { meeting } = Astro.props;
---

<MeetingDetail meeting={meeting} season={ARCHIVED} />
```

If `src/components/MeetingDetail.astro` does not exist, create it by moving the body of `src/pages/meetings/[...slug].astro` into it, taking `meeting` and `season` as props, and having the live route render it too. Both routes must render the same component.

- [ ] **Step 3: Create the archive landing page**

Create `src/pages/2025/index.astro`:

```astro
---
import Layout from '../../components/Layout.astro';
import { getSeasonContent } from '../../utils/season';
import { getSeason } from '../../config/season';

const ARCHIVED = '2025-26';
const season = getSeason(ARCHIVED);
const meetings = (await getSeasonContent('meetings', ARCHIVED)).sort(
  (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
);
---

<Layout title={`${season.challenge} Season Archive`} season={ARCHIVED}>
  <div class="archive-page">
    <header>
      <h1>{season.teamName} — {season.challenge}</h1>
      <p>The {season.id} season archive. {meetings.length} meetings on record.</p>
    </header>

    <ul class="archive-meetings">
      {meetings.map((m) => (
        <li>
          <a href={`/2025/meetings/${m.slug}/`}>{m.data.title}</a>
          <time datetime={new Date(m.data.date).toISOString().split('T')[0]}>
            {new Intl.DateTimeFormat('en-US', {
              month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
            }).format(new Date(m.data.date))}
          </time>
        </li>
      ))}
    </ul>

    <nav class="archive-links">
      <a href="/2025/calendar/">Calendar</a>
          <a href="/2025/newsletters/">Newsletters</a>
      <a href="/2025/blog/">Blog</a>
    </nav>
  </div>
</Layout>
```

- [ ] **Step 4: Create the remaining archive routes**

Create `src/pages/2025/calendar.astro`, `src/pages/2025/newsletters/index.astro`, `src/pages/2025/newsletters/[...slug].astro`, `src/pages/2025/blog/index.astro`, and `src/pages/2025/blog/[...slug].astro`.

Each index route mirrors Step 3: import `Layout`, call `getSeasonContent('<collection>', '2025-26')`, pass `season={ARCHIVED}` to `Layout`, and render links prefixed with `/2025/`. Each `[...slug].astro` mirrors Step 2: `getStaticPaths` over `getSeasonContent('<collection>', '2025-26')`, rendering the same detail component the live route uses with `season="2025-26"`.

`/2025/photos` is deliberately NOT created: `photos.astro` is static explanatory prose with no content query, so an archived copy would carry no information. Archived photos remain visible via the `R2PhotoGallery` on each archived meeting page, which is where they actually live.

- [ ] **Step 5: Add the archive entry points**

In `src/components/Footer.astro`, add a link to `/2025/` labelled `2025 Season Archive`.
In `src/components/Header.astro`, add a nav entry labelled `2025 Season` pointing at `/2025/`.

- [ ] **Step 6: Verify both seasons build**

Run: `npm run build`
Then:

```bash
ls dist/2025/meetings/ | wc -l   # expect 28
ls dist/meetings/ 2>/dev/null | wc -l  # expect 0 until Task 11
```

Expected: 28 archived meeting pages generated.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ src/components/
git commit -m "feat: serve the 2025-26 season as an archive under /2025/"
```

---

## Task 8: BIOGLOW theming with archived palette override

**Files:**
- Modify: `src/styles/global.css:4-65`
- Modify: `src/layouts/Layout.astro` and `src/components/Layout.astro`

**Interfaces:**
- Consumes: `getSeason` from Task 3
- Produces: `data-season` attribute on `<html>`; archived pages render the 2025 palette

- [ ] **Step 1: Replace the root palette with BIOGLOW**

In `src/styles/global.css`, replace the color custom properties in `:root` with:

```css
:root {
  --color-deep-teal: #0F3A47;
  --color-light-green: #C3E39A;
  --color-leaf-green: #3E8E3E;
  --color-leaf-green-deep: #2E6B2E;  /* links/headings: AA on cream */
  --color-cream: #F2E3C4;
  --color-glow-yellow: #FFD21E;
  --color-signal-red: #EE2027;
  --color-near-black: #111A20;

  --color-accent: var(--color-leaf-green-deep);
  --color-background: var(--color-cream);
  --color-surface: #ffffff;
  --color-text-primary: var(--color-near-black);
}
```

Keep every other existing custom property (spacing, fonts, `--grid-unit`) untouched.

- [ ] **Step 2: Rework the dark and llama theme blocks**

`[data-theme="dark"]` derives from deep teal rather than neutral grey. `[data-theme="llama"]` keeps the 🦙 rain but recolors from Peru brown to bioluminescent green:

```css
[data-theme="dark"] {
  --color-background: var(--color-deep-teal);
  --color-surface: #14485a;
  --color-text-primary: var(--color-cream);
  --color-accent: var(--color-light-green);
}

[data-theme="llama"] {
  --color-background: #0a2b35;
  --color-surface: #103c49;
  --color-text-primary: var(--color-light-green);
  --color-accent: var(--color-glow-yellow);
}
```

Leave the `[data-theme="llama"] body` rule and the llama-rain animation CSS as they are.

- [ ] **Step 3: Add the archived-season override**

Append to `src/styles/global.css`. This must come after the theme blocks so it wins:

```css
/* Archived seasons keep their original identity. 2025-26 was red-on-white. */
[data-season="2025-26"] {
  --color-accent-red: #dc2626;
  --color-accent: var(--color-accent-red);
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text-primary: #1f2937;
}

[data-season="2025-26"][data-theme="dark"] {
  --color-accent: #ff3333;
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-text-primary: #f9fafb;
}
```

- [ ] **Step 4: Set the attribute from the layout**

In both `src/layouts/Layout.astro` and `src/components/Layout.astro`, accept an optional `season` prop defaulting to `CURRENT_SEASON` and render it onto the `<html>` element:

```astro
---
import { CURRENT_SEASON } from '../config/season';
const { season = CURRENT_SEASON } = Astro.props;
---
<html lang="en" data-season={season}>
```

Archive routes from Task 7 already pass `season="2025-26"` down to their components; ensure that value reaches the layout.

- [ ] **Step 5: Verify the override renders**

Run: `npm run build`
Then: `grep -o 'data-season="[^"]*"' dist/2025/index.html dist/index.html`
Expected: `dist/2025/index.html` shows `data-season="2025-26"`; `dist/index.html` shows `data-season="2026-27"`.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css src/layouts/ src/components/
git commit -m "feat: apply BIOGLOW palette with 2025 archive override"
```

---

## Task 9: Render frozen history on archived meetings

**Files:**
- Create: `src/components/ArchivedSignups.astro`
- Modify: `src/components/MeetingDetail.astro`

**Interfaces:**
- Consumes: `src/data/2025-26-history.json` from Task 2; `MeetingDetail` from Task 7
- Produces: `<ArchivedSignups meetingDate={string} />` — read-only attendance and snack duty, no network call

- [ ] **Step 1: Create the component**

Create `src/components/ArchivedSignups.astro`:

```astro
---
import history from '../data/2025-26-history.json';

interface Props {
  meetingDate: string; // YYYY-MM-DD
}

const { meetingDate } = Astro.props;

const rsvpRecord = history.rsvps.find((r) => r.meetingDate === meetingDate);
const snackRecord = history.snacks.find((r) => r.meetingDate === meetingDate);
const snackFamily = snackRecord?.kids.find((k) => k.status && k.status !== '')?.name ?? null;
const attendees = rsvpRecord?.kids ?? [];
---

{(attendees.length > 0 || snackFamily) && (
  <section class="archived-signups">
    <h3>Attendance &amp; Snacks</h3>
    <p class="archived-note">Historical record from the 2025-26 season.</p>

    {attendees.length > 0 && (
      <ul class="archived-rsvps">
        {attendees.map((kid) => (
          <li><span class="kid">{kid.name}</span> <span class="status">{kid.status}</span></li>
        ))}
      </ul>
    )}

    {snackFamily && <p class="archived-snack">🍰 Snacks: {snackFamily}</p>}
  </section>
)}

<style>
  .archived-signups {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    padding: calc(var(--grid-unit) * 3);
    margin: calc(var(--grid-unit) * 4) 0;
  }
  .archived-note { color: var(--color-text-muted); font-style: italic; }
  .archived-rsvps { list-style: none; padding: 0; }
</style>
```

- [ ] **Step 2: Wire it into archived meetings only**

In `src/components/MeetingDetail.astro`, add these imports to the frontmatter:

```ts
import ArchivedSignups from './ArchivedSignups.astro';
import { CURRENT_SEASON } from '../config/season';

const { meeting, season = CURRENT_SEASON } = Astro.props;
const isoDate = new Date(meeting.data.date).toISOString().split('T')[0];
```

Then render `RSVPComponent` and `SnackDutyComponent` for the current season, and `ArchivedSignups` for archived seasons:

```astro
{season === CURRENT_SEASON ? (
  <>
    <RSVPComponent meetingDate={isoDate} />
    <SnackDutyComponent meetingDate={isoDate} />
  </>
) : (
  <ArchivedSignups meetingDate={isoDate} />
)}
```

- [ ] **Step 3: Verify archived pages make no API call**

Run: `npm run build`
Then: `grep -rl "script.google.com" dist/2025/ || echo "no live API references in archive"`
Expected: `no live API references in archive`.

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: render frozen 2025-26 signup history on archived meetings"
```

---

## Task 10: Author the 2026-27 meeting files

**Files:**
- Create: 21 files in `src/content/meetings/`

**Interfaces:**
- Consumes: schema from Task 5
- Produces: 21 entries with `season: "2026-27"`

Every file uses `season: "2026-27"`. Sunday sessions use `startTime: "14:00"`, `duration: 2`, and the Moraga location. 12/6 is deliberately skipped (it follows the all-day 12/5 tournament). 11/29 falls on Thanksgiving weekend and is scheduled deliberately.

- [ ] **Step 1: Create the 17 Sunday sessions**

Dates: `2026-08-16`, `08-23`, `08-30`, `09-06`, `09-13`, `09-20`, `09-27`, `10-04`, `10-11`, `10-18`, `10-25`, `11-01`, `11-08`, `11-15`, `11-22`, `11-29`, `12-13`.

Filenames are `YYYY-MM-DD-sunday-session.md`, except `2026-08-16-season-kickoff.md` and `2026-12-13-celebration.md`.

Template for a standard session (substitute the date):

```markdown
---
title: "Sunday Session"
date: 2026-09-06
season: "2026-27"
startTime: "14:00"
duration: 2
location: "188 Calle La Montana, Moraga, CA, 94556"
agenda:
  - "Robot Game progress"
  - "Innovation Project work"
assignments: []
---

# Sunday Session

## Meeting Agenda

### Robot Game progress

### Innovation Project work

## Meeting Notes

*Notes will be added here*
```

For `2026-08-16-season-kickoff.md` use `title: "Season Kickoff — BIOGLOW"` and an agenda of `"Watch the season reveal"`, `"Unbox and assemble mission models"`, `"Meet the team"`.

For `2026-12-13-celebration.md` use `title: "Season Celebration"` and an agenda of `"Season recap"`, `"Awards and highlights"`.

- [ ] **Step 2: Create the four special events**

`2026-09-14-coach-check-in.md`:

```markdown
---
title: "Coach Check-in"
date: 2026-09-14
season: "2026-27"
startTime: "19:00"
duration: 1
location: "Virtual"
agenda:
  - "Season planning check-in"
assignments: []
---

# Coach Check-in

Virtual coach check-in.
```

`2026-10-24-practice-tournament-robot-game.md` — `startTime: "09:00"`, `duration: 2`, `location: "PMS Campus"`, title `"Practice Tournament — Robot Game"`. Add `timeTBD: true` (see Step 3) and note in the body that the start time is to be confirmed.

`2026-11-14-practice-tournament-innovation.md` — same shape, `location: "PHS Campus"`, title `"Practice Tournament — Innovation Project"`, also `timeTBD: true`.

`2026-12-05-piedmont-makers-tournament.md` — `startTime: "08:00"`, `duration: 9`, `location: "TBD"`, title `"Piedmont Makers Community Tournament"`.

- [ ] **Step 3: Add the `timeTBD` field to the meetings schema**

In `src/content/config.ts`, add to the `meetings` schema:

```ts
    timeTBD: z.boolean().default(false),
```

In `src/utils/meeting-time.ts`, add a wrapper so the UI can render honestly rather than showing a placeholder time as fact:

```ts
export function formatMeetingTimeOrTBD(
  startTime?: string,
  duration?: number,
  timeTBD = false
): string {
  if (timeTBD) {
    const durationText = duration === 1 ? '1 hour' : `${duration} hours`;
    return duration ? `Time TBD (${durationText})` : 'Time TBD';
  }
  return formatMeetingTime(startTime, duration);
}
```

Add the test to `src/utils/__tests__/meeting-time.test.ts`:

```ts
import { formatMeetingTimeOrTBD } from '../meeting-time';

describe('formatMeetingTimeOrTBD', () => {
  it('reports TBD with duration when the time is unconfirmed', () => {
    expect(formatMeetingTimeOrTBD('09:00', 2, true)).toBe('Time TBD (2 hours)');
  });

  it('falls through to the normal format when confirmed', () => {
    expect(formatMeetingTimeOrTBD('14:00', 2, false)).toBe('2pm (2 hours)');
  });
});
```

Then use `formatMeetingTimeOrTBD` in `src/pages/meeting-plans.astro`, `src/pages/calendar.astro`, and `src/components/MeetingDetail.astro`.

- [ ] **Step 4: Verify the count and run the tests**

Run:

```bash
npm test
ls src/content/meetings/2026-*.md | wc -l
```

Expected: tests PASS; count is `21`.

- [ ] **Step 5: Verify the build generates the pages**

Run: `npm run build && ls dist/meetings/ | wc -l`
Expected: `21`.

- [ ] **Step 6: Commit**

```bash
git add src/content/meetings/ src/content/config.ts src/utils/meeting-time.ts src/utils/__tests__/meeting-time.test.ts src/pages/ src/components/
git commit -m "feat: add 2026-27 BIOGLOW meeting schedule"
```

---

## Task 11: Rebuild the resources page

**Files:**
- Modify: `src/pages/resources.astro`

**Interfaces:**
- Consumes: nothing
- Produces: resources page linking only BIOGLOW documents

All ten URLs below were verified to return HTTP 200 on 2026-08-16. Base is `https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/`.

Note the naming change from last season: BIOGLOW uses `-updates.pdf` where UNEARTHED used `-challenge-updates.pdf`. The old form 404s.

- [ ] **Step 1: Replace the page content**

Rewrite `src/pages/resources.astro`, keeping the existing layout, banner, and section markup structure but replacing the heading with `🏆 FLL BIOGLOW™ Season Resources` and the link list with:

| Label | URL |
|---|---|
| Season Overview | `…/fll-challenge-bioglow-season-overview.pdf` |
| Robot Game Rulebook | `…/fll-challenge-bioglow-rgr.pdf` |
| Robot Game Rulebook (Interactive) | `…/interactive-rgr/index.html` |
| Engineering Notebook | `…/fll-challenge-bioglow-en.pdf` |
| Team Meeting Guide | `…/fll-challenge-bioglow-tmg.pdf` |
| Challenge Updates | `…/fll-challenge-bioglow-updates.pdf` |
| Field Set-Up Reference Guide | `…/fll-challenge-bioglow-field-setup-reference-guide.pdf` |
| Participation Rules | `…/fll-challenge-bioglow-participation-rules.pdf` |
| Multimedia Resources | `…/fll-challenge-bioglow-multimedia-resources.pdf` |
| Wireframe & Grid | `…/fll-challenge-bioglow-wireframe-grid.pdf` |

Delete the stale SUBMERGED (2024-25) participation-rules link entirely — it was left over from two seasons ago.

Update the page `description` prop to reference BIOGLOW rather than UNEARTHED.

- [ ] **Step 2: Verify every link resolves**

Run:

```bash
grep -o 'https://firstinspires[^"]*' src/pages/resources.astro | sort -u | while read u; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -I "$u")  $u"
done
```

Expected: every line starts with `200`. Any `404` means a URL typo — fix before committing.

- [ ] **Step 3: Verify no UNEARTHED references remain**

Run: `grep -in "unearthed\|submerged\|2025-26" src/pages/resources.astro || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/resources.astro
git commit -m "feat: replace UNEARTHED resources with verified BIOGLOW documents"
```

---

## Task 12: Branding and copy

**Files:**
- Modify: `src/config.ts`
- Modify: `public/site-title.svg`
- Modify: `public/favicon.svg`
- Modify: `src/pages/about.astro`, `src/pages/contact.astro`, `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCurrentSeason` from Task 3
- Produces: `config.title` derives from `season.ts`; no hardcoded team name outside `season.ts`

- [ ] **Step 1: Derive site config from the season**

In `src/config.ts`, import the season and use it. Also fix `siteUrl`, which currently reads `https://fll-astro.com` and contradicts `astro.config.mjs`:

```ts
import { getCurrentSeason } from './config/season';

const season = getCurrentSeason();

export const config: SiteConfig = {
  title: season.teamName,
  description: `FIRST LEGO League ${season.challenge} season — meetings, schedule, and progress`,
  author: {
    name: 'FLL Team',
    bio: `FIRST LEGO League robotics team sharing our ${season.challenge} season journey.`,
    avatar: '/images/avatar.jpg',
  },
  social: { email: 'team@fll-astro.com' },
  siteUrl: 'https://fll.sharpers.com',
};
```

- [ ] **Step 2: Update the branding assets**

Recolor `public/site-title.svg` to the BIOGLOW palette and set its text to `Bio-Llamas`. Recolor `public/favicon.svg` to leaf green `#3E8E3E` on deep teal `#0F3A47`.

- [ ] **Step 3: Remove remaining hardcoded season and team references**

Run: `grep -rin "looting llamas\|unearthed" src/ public/ --include="*.astro" --include="*.ts" --include="*.css" --include="*.svg"`

Every hit outside `src/config/season.ts` and `src/content/` must be replaced with a value read from `season.ts`. Content files under `src/content/` are historical records and must NOT be edited.

Note the generated calendar feed carries the old team name in THREE places, all produced by
`src/pages/calendar.ics.ts` (not `calendar.ts`). Verify against a built feed, not just source:

```bash
npm run build && grep -n "Looting Llamas" dist/calendar.ics
```

- `PRODID:-//Looting Llamas//Team Calendar//EN`
- `X-WR-CALNAME:Looting Llamas Team Meetings`
- every event's `DESCRIPTION:Looting Llamas Team Meeting\n\nAgenda:...`

All three must read from the season config. `src/utils/calendar.ts:21` has a fourth,
separate `PRODID` used by the client-side download helper — change that too.

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: both pass.

Run: `grep -rin "fll-astro.com" src/config.ts || echo "siteUrl fixed"`
Expected: `siteUrl fixed`.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/config/season.ts public/ src/pages/ src/utils/calendar.ts
git commit -m "feat: rebrand to Bio-Llamas and derive identity from season config"
```

---

## Task 13: Extract the signups data layer

**Files:**
- Create: `src/lib/signups.ts`
- Test: `src/lib/__tests__/signups.test.ts`
- Modify: `src/pages/snacks.astro`, `src/pages/rsvps.astro`, `src/pages/coach_rsvps.astro`, `src/components/RSVPComponent.astro`, `src/components/SnackDutyComponent.astro`
- Delete: `src/components/RSVP.astro`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SIGNUP_API_URL: string`
  - `buildSignupUrl(action: SignupAction, params?: Record<string, string>): string`
  - `getRSVPs(date?: string): Promise<MeetingRecord[]>`
  - `updateRSVP(meetingDate: string, kidName: string, status: string): Promise<{ success: boolean }>`
  - `getSnacks(date?: string): Promise<MeetingRecord[]>`
  - `assignSnack(meetingDate: string, kidName: string): Promise<{ success: boolean }>`
  - `removeSnack(meetingDate: string, kidName: string): Promise<{ success: boolean }>`
  - `SignupAction = 'get' | 'update' | 'getSnacks' | 'assignSnack' | 'removeSnack'`

**Behavior must not change.** This is a pure extraction against the existing Apps Script backend. Query parameter names must match exactly what `google-apps-script.js` reads: `action`, `meetingDate`, `kidName`, `status` (there is no `date` param — Apps Script reads `e.parameter.meetingDate` for list filtering too).

**Astro constraint — read before starting.** The current code lives in `<script define:vars={...}>` blocks. Astro inlines `define:vars` scripts, and **inline scripts cannot use `import`**. Converting these to bundled `<script>` blocks that import from `src/lib/signups.ts` requires passing server data through the DOM instead. Use a JSON script tag:

```astro
<script type="application/json" id="signup-config" set:html={JSON.stringify({ meetings, roster })} />
<script>
  import { getSnacks, assignSnack } from '../lib/signups';
  const cfg = JSON.parse(document.getElementById('signup-config').textContent);
  // ...existing logic, now calling the imported functions
</script>
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/signups.test.ts`. Test URL construction only — the network functions are thin wrappers and are covered by the manual round-trip in Task 14.

```ts
import { describe, it, expect } from 'vitest';
import { buildSignupUrl, SIGNUP_API_URL } from '../signups';

describe('buildSignupUrl', () => {
  it('points at the Apps Script deployment', () => {
    expect(SIGNUP_API_URL).toContain('script.google.com/macros/s/');
  });

  it('sets the action parameter', () => {
    expect(new URL(buildSignupUrl('getSnacks')).searchParams.get('action')).toBe('getSnacks');
  });

  it('passes through meetingDate and kidName using the names Apps Script expects', () => {
    const url = new URL(buildSignupUrl('assignSnack', { meetingDate: '2026-09-06', kidName: 'Ishaan' }));
    expect(url.searchParams.get('action')).toBe('assignSnack');
    expect(url.searchParams.get('meetingDate')).toBe('2026-09-06');
    expect(url.searchParams.get('kidName')).toBe('Ishaan');
  });

  it('passes the status parameter for RSVP updates', () => {
    const url = new URL(buildSignupUrl('update', { meetingDate: '2026-09-06', kidName: 'Luca', status: 'yes' }));
    expect(url.searchParams.get('status')).toBe('yes');
  });

  it('omits parameters that were not supplied', () => {
    expect(new URL(buildSignupUrl('get')).searchParams.has('kidName')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- signups`
Expected: FAIL — cannot resolve `../signups`.

- [ ] **Step 3: Create `src/lib/signups.ts`**

```ts
/**
 * The single seam between the site and the signup backend.
 *
 * Today this talks to Google Apps Script. Spec 2 replaces the internals with a
 * Cloudflare Worker backed by D1; no page should need to change when it does.
 * The timeout and cache logic below exists to mask Apps Script latency
 * (1-3s per call) and is expected to be deleted with that migration.
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

export function buildSignupUrl(action: SignupAction, params: Record<string, string> = {}): string {
  const url = new URL(SIGNUP_API_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  return url.toString();
}

const DEFAULT_TIMEOUT_MS = 5000;

async function request(action: SignupAction, params: Record<string, string> = {}): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(buildSignupUrl(action, params), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const getRSVPs = (date?: string): Promise<MeetingRecord[]> =>
  request('get', date ? { date } : {});

export const updateRSVP = (meetingDate: string, kidName: string, status: string) =>
  request('update', { meetingDate, kidName, status });

export const getSnacks = (date?: string): Promise<MeetingRecord[]> =>
  request('getSnacks', date ? { date } : {});

export const assignSnack = (meetingDate: string, kidName: string) =>
  request('assignSnack', { meetingDate, kidName });

export const removeSnack = (meetingDate: string, kidName: string) =>
  request('removeSnack', { meetingDate, kidName });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- signups`
Expected: PASS, 5 tests.

- [ ] **Step 5: Repoint the five live files**

Convert each of `src/pages/snacks.astro`, `src/pages/rsvps.astro`, `src/pages/coach_rsvps.astro`, `src/components/RSVPComponent.astro`, and `src/components/SnackDutyComponent.astro` from `define:vars` to a bundled `<script>` plus a JSON config tag, as shown in the Astro constraint above.

Remove from each file: the hardcoded `SNACK_API_URL` / `RSVP_API_URL` constant, the local `fetchWithTimeout` helper (`snacks.astro:875`), and any inline `new URL(this.apiUrl)` construction. Keep the localStorage caching (`snacks.astro:1171`) — it is still needed until spec 2.

Do these one file at a time, verifying with Step 7 after each.

- [ ] **Step 6: Delete the dead component**

`src/components/RSVP.astro` is imported by nothing and points at a different, stale Apps Script deployment than the rest of the site.

```bash
grep -rn "import.*RSVP" src/ | grep -v RSVPComponent
```

Expected: no output. Then:

```bash
git rm src/components/RSVP.astro
```

- [ ] **Step 7: Verify the seam is the only reference**

Run: `grep -rn "script.google.com" src/`
Expected: exactly one hit — `src/lib/signups.ts`.

Run: `npm run build && npm test`
Expected: both pass.

- [ ] **Step 8: Manually verify a live round trip**

Run `npm run dev`, open `http://localhost:4321/snacks`, claim a snack slot, reload the page, and confirm the claim persisted. Then release it and confirm the release persisted.

This is the only check that proves behavior did not change. Do not skip it.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ src/pages/ src/components/
git commit -m "refactor: consolidate signup API calls into src/lib/signups.ts

Single seam for the spec 2 backend migration. Also deletes RSVP.astro,
dead code pointing at a stale Apps Script deployment."
```

---

## Task 14: Audit

**Files:** none modified — this task verifies the ten audit points from the spec.

- [ ] **Step 1: Build and typecheck**

Run: `npm run build && npm run check && npm test`
Expected: all three pass with no errors.

- [ ] **Step 2: Verify every live route renders**

```bash
for p in calendar snacks rsvps coach_rsvps photos meeting-plans resources calculator about contact blog newsletters; do
  if [ -f "dist/$p/index.html" ] || [ -f "dist/$p.html" ]; then echo "OK   $p"; else echo "FAIL $p"; fi
done
if [ -f dist/index.html ]; then echo "OK   index"; else echo "FAIL index"; fi
```

Expected: every line `OK`.

- [ ] **Step 3: Verify archive routes render with the 2025 palette**

```bash
ls dist/2025/meetings/ | wc -l                          # expect 28
grep -o 'data-season="[^"]*"' dist/2025/index.html      # expect 2025-26
grep -c "dc2626" dist/_astro/*.css                       # expect at least 1
```

- [ ] **Step 4: Verify the calendar feed**

```bash
head -5 dist/calendar.ics
grep -c "BEGIN:VEVENT" dist/calendar.ics    # expect 21
grep -c "2025" dist/calendar.ics            # expect 0
```

Then confirm DST handling at the season boundary. Note the feed does NOT emit UTC
timestamps — it emits floating local times plus a `VTIMEZONE` block, and the calendar
client resolves the offset itself. That is the correct approach, and it means
`getMeetingDateTime`'s DST logic never reaches the feed:

```bash
# Local times, TZID-qualified — both should read T140000 with no Z suffix
grep -E "DTSTART;TZID=America/Los_Angeles:2026(1025|1101)" dist/calendar.ics

# The VTIMEZONE rules are what actually resolve DST; both must be present
grep -E "BYMONTH=3;BYDAY=2SU|BYMONTH=11;BYDAY=1SU" dist/calendar.ics
```

`getMeetingDateTime` (whose March DST bug Task 4 fixed) is used for *display* only —
`NextMeetingBanner.astro` and `meeting-plans.astro` — not for the feed.

- [ ] **Step 5: Verify the derived feeds**

```bash
grep -c "<item>" dist/rss.xml
node -e "const s=require('./dist/search.json'); console.log(s.length, s.some(e=>String(e.url).includes('2025')) ? 'LEAK' : 'clean')"
```

Expected: RSS has current-season items only; search index reports `clean`.

- [ ] **Step 6: Verify roster propagation**

Temporarily add a sixth member to the roster in `src/config/season.ts`:

```ts
{ name: 'Testkid', initials: 'TK', returning: false },
```

Run: `npm run build`
Then: `grep -c "Testkid" dist/snacks/index.html dist/rsvps/index.html dist/coach_rsvps/index.html`

Expected: at least one hit in each of the three files, and no layout overflow when viewed in the browser. **Then revert the change** and rebuild:

```bash
git checkout src/config/season.ts && npm run build
```

- [ ] **Step 7: Verify all resource links resolve**

```bash
grep -o 'https://firstinspires[^"]*' src/pages/resources.astro | sort -u | while read u; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -I "$u")  $u"
done
```

Expected: all `200`.

- [ ] **Step 8: Verify the archive is self-contained**

```bash
grep -rl "script.google.com" dist/2025/ || echo "archive makes no API calls"
grep -rn "script.google.com" src/ | wc -l    # expect exactly 1
```

- [ ] **Step 9: Verify signups still work and themes cycle**

Run `npm run dev` and confirm by hand:

- `/snacks` claim and release persists across reload
- `/rsvps` status change persists across reload
- Theme toggle cycles light → dark → llama on a current-season page
- Theme toggle cycles correctly on `/2025/` and the red palette is retained in all three modes
- R2 photo gallery loads on an archived meeting page

- [ ] **Step 10: Commit the audit results**

```bash
git commit --allow-empty -m "chore: BIOGLOW season reset audit complete"
```

---

## Deferred to spec 2

- Replacing Apps Script with Cloudflare D1 + Worker (rewrites `src/lib/signups.ts` internals and `google-apps-script.js`; touches no page).
- Deleting the localStorage cache and timeout workarounds once the backend is fast.
- Retiring the Google Sheet.
