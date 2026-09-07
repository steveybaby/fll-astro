# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project

Astro 5 static site for a FIRST LEGO League team — meetings, RSVPs, snack duty,
photos, calendar feeds. Deployed to GitHub Pages at `https://fll.sharpers.com`.

`README.md` is the user-facing manual and is accurate — read it for setup, the
photo pipeline, and content authoring. This file covers what the README doesn't:
the invariants that make changes safe.

## Commands

```
npm run dev          # localhost:4321
npm run build        # → ./dist (66 pages)
npm test             # vitest, 101 tests — fast, run it before every commit
npm run check        # astro check (types + template diagnostics)
npm run test:worker  # signups Worker tests, in-memory D1
npm run worker:dev   # local Worker
npm run sync-photos  # process source-photos/ → R2, rewrites photo-manifest.json
```

Node **>=18.20.8** required (Astro 5 refuses to start below it). CI pins Node 20.

## Architecture

**Two independently deployed halves.**

1. **The site** — static Astro, built and pushed to GitHub Pages by
   `.github/workflows/deploy.yml` on every push to `main`.
2. **`workers/signups`** — a Cloudflare Worker + D1 database (`fll-signups`)
   holding all RSVP and snack data. Deployed separately with `wrangler deploy`.
   Excluded from the root `tsconfig.json`; it has its own.

They are coupled in one direction that is easy to miss: **the Worker fetches the
roster from the published site** at `https://fll.sharpers.com/signups-config.json`
(`CONFIG_URL` in `wrangler.toml`). So a roster change is a *site* deploy, and it
does not take effect on the backend until that deploy is live.

`src/lib/signups.ts` is the only seam between the site and the signup API — five
exported functions, request coalescing via an in-flight map, cache eviction on
write. Components never call the Worker directly. Keep it that way.

## `src/config/season.ts` is the source of truth

Roster, coaches, team name, challenge name, and per-season meeting defaults all
live here, keyed by season id. `CURRENT_SEASON` selects the active one.
`src/config.ts` derives site title and description from it — don't hardcode the
team name anywhere.

**Names in `roster`/`coaches` are the signup primary key.** D1 rows are keyed on
`(meeting_date, person, kind)` where `person` is the display name.
Consequences:

- A name the Worker hasn't seen is rejected with `400 unknown person`.
- Two people sharing a name would silently share one row —
  `buildSignupsConfig` (`src/lib/signups-config.ts`) fails the build instead.
- **Renaming someone orphans their existing rows.** Migrate the D1 data
  deliberately; a rename is not a cosmetic edit.

Past seasons stay in `SEASONS` with `archived: true` and an `archivePath`
(`/2025` for 2025-26). `ARCHIVED_SEASONS` drives the archive links in the header
and footer, so a season reset shouldn't need any hardcoded `/2025`-style paths.

## Content collections

`src/content/config.ts` defines two collections, `blog` and `meetings`, both
Zod-validated — a frontmatter mistake fails the build rather than rendering
wrong. Both default `season` to `CURRENT_SEASON`, which is how season filtering
works; archived-season content carries an explicit `season`.

Meeting files are `src/content/meetings/YYYY-MM-DD-slug.md`. Notable optional
fields: `startTime` (`"14:00"`), `duration` (hours, e.g. `2.5`), `timeTBD` (true
when `startTime` is a placeholder, not confirmed), `milestone` (short timeline
label; absent means not a milestone), `agenda`, and `assignments`.

Multiple meetings can share a date (see the several `2025-12-13-*` files) — the
slug disambiguates, not the date.

## Photos

`npm run sync-photos` reads `source-photos/YYYY-MM-DD/`, generates thumbnails
with sharp, uploads to R2, and rewrites `src/data/photo-manifest.json`, which is
committed and is what the site renders from. Requires R2 credentials in `.env`
(see `.env.example` and `R2_SETUP.md`); the manifest currently points at bucket
`site-images`. The `r2-photo-sync.yml` workflow is **disabled** — syncing is a
local, manual step.

## Gotchas

- **`google-apps-script*.js` is the retired backend, kept on purpose** as the
  rollback path, and still deployed. Nothing in the site calls it. Don't delete
  it or its Sheet until the Worker has carried a full cycle of real signups.
- `.github/workflows/deploy.yml` builds from `main` on every push — a commit to
  `main` is a production deploy. There is no staging.
- Worker schema changes go through `wrangler d1 migrations` against
  `fll-signups`, not by editing `schema.sql` alone.
- **`npm run dev` writes to production signup data.** `SIGNUP_API_URL` is
  hardcoded to the deployed Worker, so RSVP/snack clicks on the dev site hit the
  real D1. Use `npm run test:worker` (in-memory D1) to exercise that backend, or
  `npm run worker:dev` for a local Worker to point at.
- `docs/superpowers/{plans,specs}/` holds design docs for past work
  (BIOGLOW reskin, season reset, signups backend). Useful history — read the
  spec before revisiting one of those areas.
