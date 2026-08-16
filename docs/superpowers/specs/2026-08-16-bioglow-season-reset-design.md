# BIOGLOW Season Reset — Design

**Date:** 2026-08-16
**Status:** Approved for planning
**Scope:** Spec 1 of 2. Covers archiving the 2025-26 season, resetting the site for
2026-27 (BIOGLOW), and auditing the result. The Google Sheets → database migration is
deliberately excluded and will be specced separately.

---

## Problem

The site at `fll.sharpers.com` is built around a single, implicit season. Season identity
is scattered across the codebase rather than declared anywhere: the roster is hardcoded in
three files, the resources page hardcodes UNEARTHED document URLs, and every listing page
hand-rolls its own date filtering. Starting a new season currently means editing a dozen
files and destroying the previous season's record in the process.

Two goals follow:

1. Start the 2026-27 BIOGLOW season with fresh content and visual identity.
2. Preserve the 2025-26 season — meeting records, notes, photos, attendance history — as a
   browsable archive rather than deleting it.

A third goal is structural: make the *next* season reset a config change rather than a
migration.

## Non-goals

- Replacing Google Sheets as the RSVP/snack backend (spec 2). The *seam* that migration
  will use is in scope — see Signup data layer — but the backend itself is untouched here.
- Changing typography, hosting, or the photo pipeline.
- Refactoring code unrelated to season identity.

---

## Architecture

### Season configuration

A new `src/config/season.ts` becomes the single source of truth:

```ts
export const CURRENT_SEASON = "2026-27";

export const SEASONS = {
  "2026-27": {
    id: "2026-27",
    challenge: "BIOGLOW",
    teamName: "Bio-Llamas",          // placeholder, pending final name
    archived: false,
    roster: [...],
    defaults: {
      startTime: "14:00",
      duration: 2,
      location: "188 Calle La Montana, Moraga, CA, 94556",
    },
  },
  "2025-26": { id: "2025-26", challenge: "UNEARTHED", teamName: "Looting Llamas", archived: true, ... },
};
```

The roster is declared once:

| Name | Initials | Status |
|---|---|---|
| Jasper H. | `JH` | Returning |
| Ethan M. | `EM` | Returning |
| Luca S. | `LS` | Returning |
| Ishaan Arora | `IA` | New |
| Hudson Hoover | `HH` | New |

A sixth member is possible mid-season. Adding one must be a single edit to this array that
propagates to the snacks table, RSVP grid, and coach RSVP view without further changes.
This is a hard requirement, not a nicety — layouts must derive their column counts from
`roster.length`.

### Content model

All three collections (`meetings`, `newsletter`, `blog`) gain:

```ts
season: z.string().default(CURRENT_SEASON)
```

Existing content — 27 meetings, 1 newsletter, 1 blog post — is backfilled with
`season: "2025-26"`.

A shared `src/utils/season.ts` exposes `getSeasonContent(collection, season)`. Every
listing page routes through it instead of re-implementing date filtering. This replaces
the duplicated filter logic currently in `index.astro`, `calendar.astro`, `snacks.astro`,
`meeting-plans.astro`, and `photos.astro`.

### Routing

Current season keeps existing URLs. The archive is nested:

| Live | Archived |
|---|---|
| `/meetings/[slug]` | `/2025/meetings/[slug]` |
| `/calendar` | `/2025/calendar` |
| `/photos` | `/2025/photos` |
| `/newsletters` | `/2025/newsletters` |
| `/blog` | `/2025/blog` |
| `/snacks`, `/rsvps`, `/coach_rsvps` | *(no archive route — see below)* |

The three signup pages are interactive tools for the *upcoming* season and have no archive
equivalent. Historical attendance and snack duty for 2025-26 is still visible, but on the
individual archived meeting pages, rendered read-only from the frozen JSON described under
History freeze.

Archive routes are thin files that pass a season prop to the same components the live
pages use. Page bodies are extracted into shared components where needed so no page markup
is duplicated between seasons.

`/2025/` is reachable from a footer link and a small nav entry — discoverable but not
competing with the live season.

### History freeze

2025-26 RSVP and snack records exist only in the Google Sheet. Before anything else, that
data is exported to `src/data/2025-26-history.json` and committed.

Archived meeting pages render attendance and snack duty read-only from this file, with no
network call. Two consequences: the archive becomes self-contained and survives the Sheet
being retired, and spec 2 can start from an empty database instead of migrating stale rows.

**This export runs first.** It is the only step that depends on a live external service
that spec 2 will decommission.

### Signup data layer

Spec 1 reworks all three signup surfaces for the new roster. Without a seam, spec 2 would
have to re-edit those same files. So this spec introduces one.

The Apps Script backend exposes exactly five operations:

| Operation | Current call |
|---|---|
| Read RSVPs | `?action=get&date=…` |
| Set one RSVP | `?action=update&meetingDate=…&kidName=…&status=…` |
| Read snacks | `?action=getSnacks&date=…` |
| Claim snack duty | `?action=assignSnack&meetingDate=…&kidName=…` |
| Release snack duty | `?action=removeSnack&meetingDate=…&kidName=…` |

All five move into `src/lib/signups.ts`, which owns the endpoint URL, request shaping,
timeouts, and caching. Pages import named functions and never construct a URL.

This consolidates three things currently duplicated across the codebase:

- The endpoint URL, hardcoded in five live files: `snacks.astro`, `rsvps.astro`,
  `coach_rsvps.astro`, `RSVPComponent.astro`, `SnackDutyComponent.astro`.
- A hand-rolled `fetchWithTimeout` wrapper (`snacks.astro:875`).
- A localStorage cache with TTL (`snacks.astro:1171`).

The cache and timeout logic exist only to mask Apps Script latency: its web apps 302-redirect
to `googleusercontent.com`, cold-start a runtime, then open the Spreadsheet — 1–3s per call,
with writes serialized by `SpreadsheetApp` lock contention. This is the root cause of the
slowness that motivates spec 2. The workarounds are preserved as-is here and deleted in
spec 2, once the backend is fast enough not to need them.

**Dead code removal.** `src/components/RSVP.astro` is imported by nothing — only
`RSVPComponent.astro` is live, used by `pages/meetings/[...slug].astro`. The dead file
points at a *different* Apps Script deployment than the rest of the site, plus a second
commented-out one, so it is a stale endpoint nobody calls. It is deleted rather than
migrated. Confirmed by `grep -rn "import.*RSVP" src/`, which returns exactly one hit.

**Behavior must not change in spec 1.** This is a pure extraction against the existing
backend, verified by audit item 9.

**Spec 2 direction (recorded so the seam targets the right shape):** Cloudflare D1 with a
Worker, on the same account already serving R2 photos. Access stays open — no login —
matching current behavior. Spec 2 replaces `signups.ts` internals plus
`google-apps-script.js`, and touches no page.

### Theming

The BIOGLOW palette replaces red-on-white as primary:

| Token | Hex | Role |
|---|---|---|
| Deep teal | `#0F3A47` | Primary dark surface |
| Light green | `#C3E39A` | Panels, cards, highlights |
| Leaf green | `#3E8E3E` | Secondary accent, icons |
| Cream | `#F2E3C4` | Light surface |
| Glow yellow | `#FFD21E` | Small accents |
| Signal red | `#EE2027` | Bold accent |
| Near-black | `#111A20` | Outlines, text |

Three theme modes are preserved. Light and dark are re-derived from the palette above. The
third mode stays llama-themed — the team name retains "Llamas" — but is recolored from
Peru-brown to bioluminescent green, with the existing 🦙 rain animation intact.

Archived pages set `data-season="2025-26"` on the document element, which redefines the
palette custom properties back to the 2025 red-on-white identity — the original
`--color-accent-red: #dc2626`, not the BIOGLOW signal red above. The two reds are close but
distinct, and the archive must use the original so it matches its historical appearance. The 2025 archive
therefore looks like 2025, not like BIOGLOW. This works because the site already themes
entirely through CSS custom properties and a `data-theme` attribute; `data-season` layers
on the same mechanism.

Typography is unchanged (Oswald, Work Sans, Roboto Condensed, JetBrains Mono).

---

## Content reset

### Meeting schedule (2026-27)

Default Sunday session: 14:00–16:00, 188 Calle La Montana, Moraga, CA 94556.

**17 Sunday sessions:** 8/16, 8/23, 8/30, 9/6, 9/13, 9/20, 9/27, 10/4, 10/11, 10/18,
10/25, 11/1, 11/8, 11/15, 11/22, 11/29, 12/13.

12/6 is skipped — it follows the all-day 12/5 tournament. 11/29 falls on Thanksgiving
weekend and is scheduled deliberately.

**4 special events:**

| Date | Day | Event | Location | Time |
|---|---|---|---|---|
| 9/14 | Mon | Coach Check-in | Virtual | 19:00 |
| 10/24 | Sat | Practice Tournament — Robot Game | PMS Campus | 2 hrs, TBD |
| 11/14 | Sat | Practice Tournament — Innovation Project | PHS Campus | 2 hrs, TBD |
| 12/5 | Sat | Piedmont Makers Community Tournament | TBD | 08:00–17:00 |

8/16 is the season kickoff. 12/13 is the wrap-up/celebration session. All four special-date
weekdays were verified against the 2026 calendar. Total: 21 meeting files.

### Resources page

`resources.astro` is rebuilt around the BIOGLOW documents below. All ten URLs were verified
to return HTTP 200 on 2026-08-16.

| Document | URL |
|---|---|
| Season Overview | `…/2026-27/fll-challenge-bioglow-season-overview.pdf` |
| Robot Game Rulebook | `…/2026-27/fll-challenge-bioglow-rgr.pdf` |
| Robot Game Rulebook (Interactive) | `…/2026-27/interactive-rgr/index.html` |
| Engineering Notebook | `…/2026-27/fll-challenge-bioglow-en.pdf` |
| Team Meeting Guide | `…/2026-27/fll-challenge-bioglow-tmg.pdf` |
| Challenge Updates | `…/2026-27/fll-challenge-bioglow-updates.pdf` |
| Field Set-Up Reference Guide | `…/2026-27/fll-challenge-bioglow-field-setup-reference-guide.pdf` |
| Participation Rules | `…/2026-27/fll-challenge-bioglow-participation-rules.pdf` |
| Multimedia Resources | `…/2026-27/fll-challenge-bioglow-multimedia-resources.pdf` |
| Wireframe & Grid | `…/2026-27/fll-challenge-bioglow-wireframe-grid.pdf` |

Base: `https://firstinspires.blob.core.windows.net/fll/challenge/`

Note the naming change from last season: BIOGLOW uses `-updates.pdf` where UNEARTHED used
`-challenge-updates.pdf`. The latter 404s under `2026-27/`.

This rebuild also removes a latent bug: the current page links a SUBMERGED (2024-25)
participation rules PDF that was never updated when the site moved to UNEARTHED.

### Other pages

- **Photos, blog, newsletter** — all archived with the 2025-26 season. New season starts empty.
- **Calculator** — season-neutral (24mm real = 200mm robot). Unchanged.
- **About, contact, index** — UNEARTHED and "Looting Llamas" references reworded for BIOGLOW / Bio-Llamas.
- **Site title SVG, favicon** — reworked for the BIOGLOW palette.
- **`src/config.ts`** — title, description, and author fields updated; `siteUrl` corrected
  to `https://fll.sharpers.com` (currently the stale `https://fll-astro.com`, inconsistent
  with `astro.config.mjs`).

---

## Audit

Run after implementation:

1. `npm run build` and `npm run check` complete without errors.
2. Every live route renders: home, calendar, snacks, rsvps, coach_rsvps, photos,
   meeting-plans, resources, calculator, about, contact, blog, newsletters.
3. Every archive route renders under `/2025/` and displays the 2025 red palette.
4. `calendar.ics` validates and contains only current-season events, with correct
   Pacific-time offsets across the DST boundary (11/1/2026).
5. `rss.xml` and `search.json` regenerate and reference live-season content.
6. Adding a hypothetical 6th roster member propagates to snacks, rsvps, and coach_rsvps
   with no layout break.
7. All ten resources links return 200.
8. R2 photo gallery loads for archived meetings.
9. RSVP and snack round-trips still work against Google Sheets, unchanged in behavior.
   `grep -r "script.google.com" src/` returns exactly one hit: `src/lib/signups.ts`.
10. Theme toggle cycles light → dark → llama correctly in both seasons.

---

## Assumptions

- Meeting location for 2026-27 is unchanged from 2025-26 (188 Calle La Montana, Moraga).
  Not explicitly confirmed; flag if wrong.
- "Bio-Llamas" is a placeholder. The name lives in `season.ts` so replacing it later is a
  one-line change.
- Special-event start times marked TBD are authored with placeholder times and a `timeTBD`
  flag so the UI can render "time TBD" rather than a misleading time.
- `Scanned Document.pdf` in the repo root is untracked and left untouched.

## Risks

- **Archive route duplication.** If page bodies are not properly extracted into shared
  components, the archive becomes a second copy of every page that drifts over time.
  Mitigation: no archive route may contain page markup, only a season prop.
- **History export is one-shot.** If the Sheet is modified after export, the archive is
  stale. Mitigation: export first, and treat the JSON as authoritative from that point.
- **DST boundary.** The existing calendar code has a history of timezone bugs (three
  commits in Dec 2025). The 11/1/2026 boundary falls mid-season and needs explicit testing.

## Sequencing

1. Export 2025-26 history from Sheets to JSON. *(Blocks archive; external dependency.)*
2. Introduce `season.ts` and the content-collection `season` field; backfill 2025-26.
3. Extract shared page components; add `getSeasonContent()`; build `/2025/` routes.
4. Apply BIOGLOW theming with `data-season` override for the archive.
5. Author the 21 meeting files for 2026-27.
6. Rebuild resources; reword remaining pages; update branding assets.
7. Extract `src/lib/signups.ts`, repoint the five live files at it, and delete the dead
   `RSVP.astro`. *(Pure refactor, no behavior change — done after the roster work so it
   moves settled code, not code still in flux.)*
8. Run the audit.
