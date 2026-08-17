# BIOGLOW Reskin — Design

**Date:** 2026-08-16
**Status:** Approved for planning
**Scope:** Visual redesign and information-hierarchy rework of the live 2026-27 site.
Builds on the BIOGLOW Season Reset spec, which established `season.ts`, the archive at
`/2025/`, and the initial BIOGLOW palette.

---

## Problem

The season reset gave the site a BIOGLOW *palette* but not a BIOGLOW *design*. The tokens
in `global.css` name deep teal, leaf green, glow yellow and cream, yet the rendered page is
cream cards on a cream background with green uppercase headings — the previous season's
layout wearing new colours.

Three specific failures:

1. **Nothing signals rainforest or biodiversity.** The season is about bioluminescence and
   ecosystems. The site communicates none of it.
2. **The typography is dated.** A single global rule — `h1–h6 { text-transform: uppercase;
   letter-spacing: 0.12em }` — applies to every heading on every page, including
   body-level headings inside meeting notes and newsletters. Long-form content reads as
   barked rather than written.
3. **The homepage hierarchy does not match how it is used.** The primary visitor is a
   parent checking logistics, but the first screen is a decorative hero. Meeting time,
   location, RSVP state and snack duty are all below the fold or on other pages. Meanwhile
   the "About Our Team" section spends six near-identical cards on generic copy, one of
   which still describes a *previous* season's energy theme.

There is also no motion system of any kind, and therefore no `prefers-reduced-motion`
handling to inherit when one is added.

## Goals

1. A visual identity that reads as rainforest and biodiversity at a glance.
2. A homepage that answers a parent's logistics questions above the fold.
3. Scroll-driven motion that is felt but never blocks the primary task.
4. Typography that is legible in long-form content.

## Non-goals

- Redesigning the layouts of `rsvps`, `coach_rsvps`, `snacks`, `calculator`, `resources`,
  `categories`, `blog`, or `search`. These inherit new tokens and fonts but keep their
  current structure.
- Changing the signup backend, the photo pipeline, or the calendar feed.
- Fixing the pre-existing `astro check` error baseline.
- Restructuring `season.ts` or the archive routing.

---

## Direction

Chosen from three explored options (bioluminescent night; canopy daylight; naturalist field
guide), validated as rendered homepage mockups rather than palettes.

**Canopy Daylight.** Cream paper, bold leaf-green blocks, layered foliage silhouettes,
glow yellow reserved for actions. It is the most legible option on a phone in daylight,
which the primary use case demands, and it keeps continuity with the existing token values.

The rejected **Bioluminescent Night** direction is not discarded — it becomes the dark
theme, so dark mode carries its own identity rather than being a dimmer light mode.

---

## Architecture

### Token layer

`src/styles/global.css` currently does five jobs in 283 lines: palette, themes, archive
overrides, reset, and element defaults. It splits into three files, with `global.css`
retained as an import barrel so no consumer changes its import statement.

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` | Palette primitives, semantic tokens, type scale, space scale, radii, motion timings |
| `src/styles/base.css` | Reset and element defaults |
| `src/styles/motion.css` | Reveal and parallax classes, reduced-motion kill switch |
| `src/styles/global.css` | Imports the above three, in that order |

**Fluid type scale.** Component CSS currently hardcodes sizes (`font-size: 2.5rem`,
`1.375rem`, `0.85rem`) in every file. `tokens.css` defines `--step--2` through `--step-5`
using `clamp()`. Components migrate to the steps as they are touched; untouched components
keep working because the raw rem values remain valid CSS.

**Space scale.** `--space-2xs` … `--space-3xl`, defined as multiples of the existing
`--grid-unit`. Existing `calc(var(--grid-unit) * n)` expressions stay valid, so migration is
incremental rather than a flag day.

### Themes

Three themes, all defined in `tokens.css`, all setting the same semantic token names:

| Selector | Identity |
|---|---|
| `:root` | **Canopy Daylight** — cream paper, leaf-green blocks, yellow actions |
| `[data-theme="dark"]` | **Bioluminescent Night** — deep teal ground, glowing green and yellow accents |
| `[data-theme="glow"]` | Night pushed further; the full bioluminescent easter egg |

`[data-theme="glow"]` replaces `[data-theme="llama"]`, which is an orphan of the Looting
Llamas season. The rename touches three files: `tokens.css`, `ThemeToggle.astro`, and
`public/theme-init.js`. The llama-rain easter egg in `ThemeToggle.astro` is rebuilt as
drifting spores.

**Migration requirement:** a visitor with `theme: "llama"` in `localStorage` must be
migrated to `"glow"`, not silently reset to the system default. `theme-init.js` performs
the rewrite on read, before applying the attribute, and writes the corrected value back.

### Archive protection

The existing `[data-season="2025-26"]` block overrides *colours only*. That behaviour is
preserved exactly: archive pages inherit the new typography, spacing and layout, but keep
the original red-on-white identity (`#dc2626`, not the BIOGLOW `#EE2027`). The compound
`[data-season="2025-26"][data-theme="dark"]` selector must continue to win over the new
dark theme.

This is deliberate. Freezing the archive's *colour* preserves its identity; freezing its
*type* would leave it visibly broken beside redesigned pages.

### Typography

Add `@fontsource-variable/fraunces` (v5.3.0 — one variable file, `opsz`/`SOFT`/`WONK`
axes). Both `--font-heading-primary` and `--font-heading-secondary` point at Fraunces.
`--font-body` (Work Sans) and `--font-mono` (JetBrains Mono) are unchanged.

Pointing both heading vars at Fraunces means out-of-scope pages inherit the new type
automatically. This is intended — a page keeping Oswald beside a redesigned page reads as
a bug.

Oswald and Roboto Condensed are removed from `package.json` and `Layout.astro` only after a
repo-wide grep confirms no remaining references.

**The rule that changes:**

```css
/* deleted from base.css */
h1, h2, h3, h4, h5, h6 { text-transform: uppercase; letter-spacing: 0.12em; }
```

Replaced by:

- `h1`–`h6`: Fraunces, sentence case, tight negative tracking.
- `.eyebrow` / `.label`: the only classes carrying uppercase and letter-spacing. Used for
  kickers, badges, and mono metadata.

### Motion system

Three mechanisms, in order of preference:

1. **CSS-only.** The sticky logistics bar is `position: sticky`. No JavaScript.
2. **IntersectionObserver.** `[data-reveal]` elements gain `.is-visible` on entry.
3. **Throttled rAF scroll handler.** `[data-parallax="0.3"]` elements get
   `transform: translate3d(0, …, 0)` at the given rate. `will-change` is applied only
   while the element is in view, and removed on exit.

All of it lives in `src/scripts/motion.ts`, loaded from `Layout.astro`.

**No-JS and no-FOUC.** The hidden initial state for `[data-reveal]` is scoped to
`html.js`, a class set by an inline head script alongside the existing theme bootstrap.
Without JavaScript the selector never matches and all content renders normally.

**Reduced motion.** `motion.ts` checks
`matchMedia('(prefers-reduced-motion: reduce)')` on init. If it matches — or if
`IntersectionObserver` is unavailable — every `[data-reveal]` element is marked visible
immediately and no scroll listener is ever attached. `motion.css` carries the same
guarantee declaratively for the no-JS path.

### Components

**New**, under `src/components/home/`:

| Component | Responsibility |
|---|---|
| `SplitHero.astro` | Identity left, `NextMeetingCard` right; stacks on narrow viewports |
| `NextMeetingCard.astro` | Date, time, location, RSVP link. Reuses the meeting-resolution logic already in `NextMeetingBanner.astro` |
| `QuickActions.astro` | Snacks, calendar, newsletter |
| `SeasonTimeline.astro` | Milestones derived from the meetings collection; draws on scroll |
| `PhotoStrip.astro` | Most recent R2 thumbnails |

Plus `src/components/Canopy.astro` — the parallax foliage SVG, taking a variant and a
parallax rate, reused across sections.

**Modified:** `Layout.astro` (motion script, `js` bootstrap), `Header.astro`,
`Footer.astro`, `Sidebar.astro`, `ThemeToggle.astro`, and the six in-scope pages
(`index`, `about`, `meeting-plans`, `newsletters`, `calendar`, `photos`).

`Header.astro` is 963 lines carrying nav, mobile menu, search overlay and all their CSS and
JavaScript. It is the largest single piece of work and where regression risk concentrates.
Its behaviour is not being changed — only its styling — so its existing JavaScript is left
alone.

### Data flow

`SeasonTimeline` and `PhotoStrip` are the only new components that read data.

**Timeline.** Derives milestones from the meetings collection at build time, filtered to
the current season via the existing `getSeasonContent()` helper.

Milestones are marked **explicitly**, not inferred. The meetings schema in
`src/content/config.ts` gains one optional field:

```ts
milestone: z.string().optional(),   // short timeline label; absent = not a milestone
```

Inference from titles was considered and rejected: the collection has no `type` field, and
15 of the 21 meetings in the 2026-27 season share the exact title `"FIRST LEGO League
Meeting"`. Any title-matching rule would be brittle and would silently break the timeline
the first time a meeting is renamed.

The field's value is the short label the timeline displays, which also solves a display
problem — `"Piedmont Makers Community Tournament"` does not fit under a timeline dot, but
`"Tournament"` does.

Five meeting files in the 2026-27 season receive the field:

| File | `milestone` |
|---|---|
| `2026-08-16-season-kickoff.md` | `Kickoff` |
| `2026-10-24-practice-tournament-robot-game.md` | `Practice 1` |
| `2026-11-14-practice-tournament-innovation.md` | `Practice 2` |
| `2026-12-05-piedmont-makers-tournament.md` | `Tournament` |
| `2026-12-13-celebration.md` | `Celebration` |

`2026-09-14-coach-check-in.md` and the 15 ordinary Sunday sessions are deliberately not
milestones. Archived 2025-26 meetings are untouched — the field is optional, so they
remain valid.

If fewer than two milestones resolve, the section does not render.

**Photo strip.** Reads `src/data/photo-manifest.json`, selects the most recent meeting
keys belonging to the current season, and takes their thumbnails. **Renders nothing below
three photos** — the section is absent rather than sparse. Only one 2026-27 meeting
(`2026-08-16`) currently has photos, so this path is the live one today and must be
correct.

### Error handling

| Condition | Behaviour |
|---|---|
| No upcoming meeting | `NextMeetingCard` shows the season's status rather than an empty card |
| Fewer than 3 photos | `PhotoStrip` renders nothing |
| Fewer than 2 timeline milestones | `SeasonTimeline` renders nothing |
| Photo manifest missing or malformed | Build fails loudly — it is a committed file, so absence is a real error |
| `IntersectionObserver` unavailable | All reveals marked visible; no scroll listener |
| `prefers-reduced-motion: reduce` | Same as above |
| JavaScript disabled | `html.js` never set; reveal styles never apply |
| `localStorage` theme is `llama` | Migrated to `glow` and written back |

---

## Content changes

Editorial, not structural, but in scope because the current copy is wrong:

1. The six "About Our Team" cards collapse to three: Robot Design, Innovation Project,
   Core Values. The other three ("Competition Ready", "Learning Together", and the
   duplicate challenge card) are generic filler.
2. The Innovation Project card currently reads *"real-world energy challenges facing our
   community"* — a previous season's theme. It is rewritten for BIOGLOW: bioluminescence,
   ecosystems, biodiversity.
3. Season timeline and photo strip are net-new homepage sections.

---

## Testing

**Baselines, measured at commit `b014fce`:**

- `npm test` — 51 tests across 5 files, all passing. Must stay at 51 or above, all passing.
- `npm run check` — **84 errors**, 0 warnings, 28 hints. Do not exceed 84. Fixing
  pre-existing errors is out of scope.
- `npm run build` — passes.

**New unit tests:**

| Test | Assertion |
|---|---|
| Timeline derivation | Meetings carrying `milestone` extracted in date order; meetings without it excluded; under two milestones yields empty |
| Photo strip selection | Returns `[]` below three photos; returns most-recent-first above; ignores archived-season keys |
| Theme migration | `llama` maps to `glow`; `dark` and `light` pass through; absent value falls back to system |

**Manual verification**, per in-scope page: desktop and mobile widths, all three themes,
and with `prefers-reduced-motion` both on and off. Specifically confirmed:

- The next meeting's date, time and RSVP are reachable above the fold at 375px width.
- The `/2025/` archive still renders red-on-white in both light and dark.
- No horizontal overflow at 320px.

---

## Risks

**Concurrent session.** Another session is committing to `main` in this repository. This
work touches `global.css`, `Layout.astro` and `Header.astro` — high-collision files.
Mitigation: implement on a branch in a git worktree, review as a single diff.

**Header.astro.** 963 lines, mixed concerns, and the shell for every page. Restyling it
carries the most regression risk in the plan. Mitigation: styling changes only, no
behavioural edits, and mobile-menu and search-overlay behaviour verified explicitly.

**Font swap reaches out-of-scope pages.** Intended, but it means `rsvps`, `snacks`,
`calculator` and `resources` change appearance without being redesigned. They need a
smoke check even though their layouts are untouched.
