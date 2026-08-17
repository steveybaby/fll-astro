# BIOGLOW Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the 2026-27 site as a rainforest/biodiversity design — Canopy Daylight palette, Fraunces display type, a Split Hero homepage that answers a parent's logistics questions above the fold, and layered scroll motion that degrades cleanly to nothing.

**Architecture:** `global.css` splits into a token layer, a base layer, and a motion layer, with `global.css` retained as an import barrel so no consumer changes its import. Three themes (Canopy Daylight / Bioluminescent Night / Glow) all set the same semantic token names. All data derivation lives in pure functions under `src/utils/` — the established pattern in this repo, where `filterBySeason` is testable and `getSeasonContent` is the thin Astro wrapper around it. Motion is one IntersectionObserver plus one throttled rAF handler, both behind a single `motionEnabled()` gate.

**Tech Stack:** Astro 5, TypeScript, Vitest, CSS custom properties, Fontsource (variable Fraunces), Cloudflare R2 (photo manifest, read-only).

**Spec:** [`docs/superpowers/specs/2026-08-16-bioglow-reskin-design.md`](../specs/2026-08-16-bioglow-reskin-design.md)

## Global Constraints

- Node 20 (matches `.github/workflows` CI).
- `npm run build` must pass at the end of every task.
- `npm test` baseline is **51 tests across 5 files, all passing** (measured at commit `b014fce`). Never finish a task below 51 passing.
- `npm run check` has a **pre-existing baseline of 84 errors** (measured at `b014fce`, down from the 91 recorded in the season-reset plan). Do not exceed 84. Fixing pre-existing errors is out of scope. Check with:
  `npm run check 2>&1 | grep -oE '^- [0-9]+ errors' | head -1`
- **Work on a branch.** Another session is committing to `main` in this repo and touches the same shell files. Create the branch before Task 1 and never commit to `main`.
- Never edit anything under `src/pages/2025/`, `src/data/2025-26-history.json`, or `src/content/meetings/2025-*.md`. The archive is frozen.
- The `[data-season="2025-26"]` and `[data-season="2025-26"][data-theme="dark"]` blocks keep their exact current colour values. Archive accent is `#dc2626`, **not** the BIOGLOW `#EE2027`.
- Theme ids are exactly `light`, `dark`, `glow`. The string `llama` survives only as a legacy localStorage value to migrate from.
- Team name, challenge name, roster, and meeting defaults are read from `src/config/season.ts` only. Never hardcode "The Thorns" or "BIOGLOW".
- Uppercase + letter-spacing is permitted **only** via the `.eyebrow` / `.label` classes. Never on `h1`–`h6`.
- Every scroll or reveal effect must be inert under `prefers-reduced-motion: reduce` and absent without JavaScript.

## The Restyle Substitution Table

Tasks 9, 10 and 11 are mechanical migrations of existing component CSS onto the token
system. They all apply **this** table. It lives here rather than inside one of those tasks
so that any of them can be executed on its own, in any order.

| Find | Replace |
|---|---|
| `font-family: var(--font-heading-secondary)` on nav, label, or UI text | `font-family: var(--font-body)` |
| `text-transform: uppercase` on any `h1`–`h6` or link/nav selector | delete the line |
| `letter-spacing: 0.05em` … `0.2em` on those same selectors | delete the line |
| `border-radius: 2px` or `3px` | `var(--radius-s)` |
| `border-radius: 4px` | `var(--radius-s)` |
| `border-radius: 8px` | `var(--radius-m)` |
| `calc(var(--grid-unit) * 1.5)` | `var(--space-xs)` |
| `calc(var(--grid-unit) * 2)` | `var(--space-s)` |
| `calc(var(--grid-unit) * 3)` | `var(--space-m)` |
| `calc(var(--grid-unit) * 4)` | `var(--space-l)` |
| `calc(var(--grid-unit) * 6)` | `var(--space-xl)` |
| `calc(var(--grid-unit) * 8)` | `var(--space-2xl)` |
| hardcoded `font-size: 0.75rem` … `0.85rem` | `var(--step--2)` |
| hardcoded `font-size: 0.9rem` … `1rem` | `var(--step--1)` |
| hardcoded `font-size: 1.125rem` … `1.25rem` | `var(--step-0)` |
| hardcoded `font-size: 1.5rem` | `var(--step-1)` |
| hardcoded `font-size: 2rem` … `2.5rem` | `var(--step-3)` |
| `transition: <props> 0.2s ease` | `transition: <props> var(--dur-fast) var(--ease-out)` |
| `transition: <props> 0.3s ease` | `transition: <props> var(--dur-base) var(--ease-out)` |
| `var(--color-light-gray)` | `var(--color-surface)` |
| `var(--color-medium-gray)` | `var(--color-text-muted)` |
| `var(--color-dark-gray)` | `var(--color-text-secondary)` |
| `color: white` on an accent background | `color: var(--color-accent-contrast)` |

**Two rules that override the table:**

1. A selector that is genuinely a *small label* — `.mobile-nav-header`, a badge, a metadata
   line — keeps its uppercase, but expressed as the standard label treatment:
   `font-family: var(--font-mono); font-size: var(--step--2); letter-spacing: 0.18em;`.
   Everything else loses uppercase entirely.
2. Never delete a `transform`, `z-index`, `position`, or `display` declaration. The table
   covers colour, type, spacing and rounding only. Layout and behaviour stay as they are.

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` | Create — palette primitives, semantic tokens, type/space scales, three themes, archive override |
| `src/styles/base.css` | Create — reset and element defaults |
| `src/styles/motion.css` | Create — reveal/parallax classes, reduced-motion kill switch |
| `src/styles/global.css` | Rewrite — import barrel only |
| `src/scripts/motion.ts` | Create — `motionEnabled()`, `initMotion()` |
| `src/utils/timeline.ts` | Create — `deriveMilestones()` |
| `src/utils/photo-strip.ts` | Create — `selectStripPhotos()` |
| `src/components/Canopy.astro` | Create — parallax foliage SVG |
| `src/components/home/SplitHero.astro` | Create — identity + meeting card, first screen |
| `src/components/home/NextMeetingCard.astro` | Create — date/time/location/RSVP |
| `src/components/home/QuickActions.astro` | Create — snacks / calendar / newsletters |
| `src/components/home/SeasonTimeline.astro` | Create — milestone rail |
| `src/components/home/PhotoStrip.astro` | Create — recent R2 thumbnails |
| `src/content/config.ts` | Modify — add optional `milestone` to meetings schema |
| `public/theme-init.js` | Rewrite — theme migration + `js` class |
| `src/components/ThemeToggle.astro` | Modify — `llama` → `glow`, spores replace llama rain |
| `src/components/Layout.astro` | Modify — Fraunces import, motion init |
| `src/components/Header.astro` | Modify — restyle only, no behaviour change |
| `src/components/Footer.astro`, `Sidebar.astro` | Modify — restyle |
| `src/pages/index.astro` | Rewrite — Split Hero assembly |
| `src/pages/{about,meeting-plans,photos}.astro` | Modify — restyle |
| `src/components/NewsletterList.astro`, `CalendarView.astro` | Modify — restyle; these are what `/newsletters` and `/calendar` actually render |

---

## Task 0: Branch

- [ ] **Step 1: Create and switch to the reskin branch**

```bash
git checkout -b reskin/bioglow-canopy
git status --short
```

Expected: on `reskin/bioglow-canopy`, working tree clean apart from the untracked `Scanned Document.pdf`.

---

## Task 1: Fonts and token architecture

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`
- Modify: `src/styles/global.css` (rewrite as barrel), `src/components/Layout.astro:1-15`, `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: CSS custom properties consumed by every later task — `--step--2`…`--step-5`, `--space-3xs`…`--space-3xl`, `--radius-{s,m,l,pill}`, `--shadow-{s,m}`, `--dur-{fast,base,slow}`, `--ease-out`, `--color-{background,surface,surface-raised,text-primary,text-secondary,text-muted,border,border-strong,accent,accent-contrast,action,action-contrast,canopy}`, `--canopy-opacity`. Plus the `.eyebrow` and `.label` classes.

- [ ] **Step 1: Install variable Fraunces**

```bash
npm install @fontsource-variable/fraunces@^5.3.0
```

- [ ] **Step 2: Create `src/styles/tokens.css`**

```css
/* Design tokens. Palette primitives, semantic mapping, scales, themes.
   Semantic tokens are the only ones components should reference. */

:root {
  /* ---- Palette primitives ---- */
  --bio-paper: #FFFDF6;
  --bio-canopy-cream: #F7EFDC;
  --bio-cream: #F2E3C4;
  --bio-leaf: #3E8E3E;
  --bio-leaf-deep: #2E6B2E;
  --bio-leaf-shadow: #14261B;
  --bio-fern: #3F5A48;
  --bio-moss: #6F8579;
  --bio-bark: #D8CFAF;
  --bio-deep-teal: #0F3A47;
  --bio-teal-abyss: #08171E;
  --bio-teal-surface: #0E2731;
  --bio-light-green: #C3E39A;
  --bio-spring: #7FC79A;
  --bio-glow-yellow: #FFD21E;
  --bio-signal-red: #EE2027;
  --bio-near-black: #111A20;

  /* ---- Legacy aliases. Sidebar.astro, about.astro and several pages
         reference these names directly; they stay until those files are
         migrated, and the archive override depends on some of them. ---- */
  --color-white: #ffffff;
  --color-light-gray: #e7efdd;
  --color-medium-gray: var(--bio-moss);
  --color-dark-gray: var(--bio-fern);
  --color-black: var(--bio-near-black);
  --color-deep-teal: var(--bio-deep-teal);
  --color-light-green: var(--bio-light-green);
  --color-leaf-green: var(--bio-leaf);
  --color-leaf-green-deep: var(--bio-leaf-deep);
  --color-cream: var(--bio-cream);
  --color-glow-yellow: var(--bio-glow-yellow);
  --color-signal-red: var(--bio-signal-red);
  --color-near-black: var(--bio-near-black);

  /* ---- Semantic tokens: Canopy Daylight (light theme) ----
     Accent is the deep leaf variant, not the logo green: leaf green on cream
     is 3.22:1, below the 4.5:1 AA floor for normal text. The deep variant
     reaches 5.08:1. --color-canopy keeps the brand green for fills, where the
     3:1 non-text threshold applies. */
  --color-background: var(--bio-canopy-cream);
  --color-surface: var(--bio-paper);
  --color-surface-raised: #FFFFFF;
  --color-text-primary: var(--bio-leaf-shadow);
  --color-text-secondary: var(--bio-fern);
  --color-text-muted: var(--bio-moss);
  --color-border: var(--bio-bark);
  --color-border-strong: var(--bio-leaf-deep);
  --color-accent: var(--bio-leaf-deep);
  --color-accent-contrast: #FFFFFF;
  --color-action: var(--bio-glow-yellow);
  --color-action-contrast: var(--bio-leaf-shadow);
  --color-canopy: var(--bio-leaf);
  --canopy-opacity: 0.24;
  --hero-gradient: linear-gradient(170deg, var(--bio-paper) 0%, #EFE6CB 100%);

  /* ---- Typography ---- */
  --font-heading-primary: 'Fraunces Variable', Fraunces, Georgia, serif;
  --font-heading-secondary: 'Fraunces Variable', Fraunces, Georgia, serif;
  --font-body: 'Work Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Fluid type scale. Every step interpolates between 360px and 1280px. */
  --step--2: clamp(0.69rem, 0.67rem + 0.09vw, 0.75rem);
  --step--1: clamp(0.83rem, 0.79rem + 0.19vw, 0.94rem);
  --step-0:  clamp(1rem, 0.94rem + 0.29vw, 1.19rem);
  --step-1:  clamp(1.2rem, 1.11rem + 0.44vw, 1.48rem);
  --step-2:  clamp(1.44rem, 1.31rem + 0.64vw, 1.85rem);
  --step-3:  clamp(1.73rem, 1.54rem + 0.92vw, 2.31rem);
  --step-4:  clamp(2.07rem, 1.81rem + 1.3vw, 2.89rem);
  --step-5:  clamp(2.49rem, 2.12rem + 1.83vw, 3.61rem);

  /* ---- Space scale, built on the existing 8px grid unit so that
         existing calc(var(--grid-unit) * n) expressions stay valid. ---- */
  --grid-unit: 8px;
  --space-3xs: calc(var(--grid-unit) * 0.5);
  --space-2xs: var(--grid-unit);
  --space-xs:  calc(var(--grid-unit) * 1.5);
  --space-s:   calc(var(--grid-unit) * 2);
  --space-m:   calc(var(--grid-unit) * 3);
  --space-l:   calc(var(--grid-unit) * 4);
  --space-xl:  calc(var(--grid-unit) * 6);
  --space-2xl: calc(var(--grid-unit) * 8);
  --space-3xl: calc(var(--grid-unit) * 12);

  /* ---- Shape and depth ---- */
  --radius-s: 6px;
  --radius-m: 10px;
  --radius-l: 16px;
  --radius-pill: 999px;
  --shadow-s: 0 1px 2px rgba(20, 38, 27, 0.06), 0 2px 8px rgba(20, 38, 27, 0.05);
  --shadow-m: 0 4px 12px rgba(20, 38, 27, 0.08), 0 12px 32px rgba(20, 38, 27, 0.07);

  /* ---- Motion ---- */
  --dur-fast: 160ms;
  --dur-base: 260ms;
  --dur-slow: 520ms;
  --ease-out: cubic-bezier(0.2, 0.7, 0.3, 1);

  /* ---- Layout ---- */
  --max-width: 1200px;
  --sidebar-width: 320px;
  --content-padding: var(--space-m);
}
```

- [ ] **Step 3: Create `src/styles/base.css`**

```css
/* Reset and element defaults. */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-background);
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  font-size: var(--step-0);
  font-weight: 400;
  background-color: var(--color-background);
  overflow-x: hidden;
}

/* Headings. The previous global `text-transform: uppercase; letter-spacing:
   0.12em` rule applied to every heading on every page, including body-level
   headings inside meeting notes, and is deliberately gone. Uppercase now
   lives only on .eyebrow / .label. */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading-primary);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.015em;
  text-transform: none;
  color: var(--color-accent);
  margin-bottom: var(--space-s);
  font-variation-settings: 'opsz' 48, 'SOFT' 24;
  text-wrap: balance;
}

h1 {
  font-size: var(--step-5);
  font-weight: 900;
  letter-spacing: -0.028em;
  line-height: 1.02;
  margin-bottom: var(--space-m);
  font-variation-settings: 'opsz' 144, 'SOFT' 40, 'WONK' 1;
}

h2 { font-size: var(--step-3); font-weight: 700; }
h3 { font-size: var(--step-2); }
h4 { font-size: var(--step-1); }
h5 { font-size: var(--step-0); }
h6 { font-size: var(--step--1); }

p {
  margin-bottom: var(--space-s);
  font-size: var(--step-0);
  max-width: 68ch;
}

a {
  color: var(--color-accent);
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

a:hover,
a:focus {
  color: var(--color-text-primary);
  text-decoration: underline;
}

:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--color-action);
  outline-offset: 2px;
  border-radius: var(--radius-s);
}

ul, ol {
  margin-bottom: var(--space-s);
  padding-left: var(--space-m);
}

li { margin-bottom: var(--space-3xs); }

blockquote {
  border-left: 4px solid var(--color-border-strong);
  padding: var(--space-s) var(--space-m);
  margin: var(--space-m) 0;
  background-color: var(--color-surface);
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
  font-style: italic;
}

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background-color: var(--color-surface);
  padding: 2px 5px;
  border-radius: var(--radius-s);
  border: 1px solid var(--color-border);
}

pre {
  font-family: var(--font-mono);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-s);
  margin: var(--space-m) 0;
  overflow-x: auto;
  border-radius: var(--radius-m);
}

pre code { background: none; border: none; padding: 0; }

img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-m);
  margin: var(--space-s) 0;
}

figcaption {
  font-size: var(--step--1);
  color: var(--color-text-muted);
  text-align: center;
  margin-top: var(--space-3xs);
}

hr {
  border: none;
  height: 2px;
  background-color: var(--color-border);
  margin: var(--space-xl) 0;
}

/* Small uppercase labels — the only place uppercase and tracking belong. */
.eyebrow,
.label {
  font-family: var(--font-mono);
  font-size: var(--step--2);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-text-muted);
  display: block;
}

.text-center { text-align: center; }
.text-muted { color: var(--color-text-muted); }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Create a placeholder `src/styles/motion.css`**

Task 3 fills this in. It must exist **before** the next step, because the barrel imports
it and a missing import fails the build.

```css
/* Motion layer. Populated in Task 3. */
```

- [ ] **Step 5: Rewrite `src/styles/global.css` as a barrel**

Replace the entire file with exactly this. Order matters — tokens must load before base.

```css
/* Import barrel. Consumers import this one file; the layers live separately.
   tokens -> base -> motion. Do not reorder. */
@import './tokens.css';
@import './base.css';
@import './motion.css';
```

- [ ] **Step 6: Swap the font imports in `src/components/Layout.astro`**

Replace lines 1–14 (the Oswald and Roboto Condensed `@fontsource` imports) with:

```
import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/work-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
```

Leave the `import '../styles/global.css';` line below it untouched.

- [ ] **Step 7: Verify the build and the check baseline**

```bash
npm run build && npm run check 2>&1 | grep -oE '^- [0-9]+ errors' | head -1
```

Expected: build exits 0; error count is 84 or fewer.

- [ ] **Step 8: Verify Fraunces is actually loading**

Start the dev server via the preview tooling (never `npm run dev` in a shell — another session owns port 4321, so let the preview tool assign its own port), open the homepage, and confirm in the browser console:

```js
getComputedStyle(document.querySelector('h1')).fontFamily
```

Expected: a string beginning `"Fraunces Variable"`. If it reports Georgia, the Fontsource family name is wrong — check `node_modules/@fontsource-variable/fraunces/index.css` for the exact `font-family` value and correct `--font-heading-primary`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/styles src/components/Layout.astro
git commit -m "feat: split the token layer and switch display type to Fraunces"
```

---

## Task 2: Themes and the llama-to-glow migration

**Files:**
- Modify: `src/styles/tokens.css` (append theme blocks), `public/theme-init.js` (rewrite), `src/components/ThemeToggle.astro`
- Test: `src/utils/__tests__/theme-init.test.ts`

**Interfaces:**
- Consumes: semantic token names from Task 1
- Produces: `[data-theme="dark"]` and `[data-theme="glow"]` selectors; `html.js` class set before first paint; `window.startSpores()` / `window.stopSpores()` on the ThemeToggle

The test executes the **real shipped `public/theme-init.js`** against stubbed globals rather than testing a duplicate of its logic. The file references only `window`, `document`, `localStorage` and `setTimeout`, so passing those four as function parameters is sufficient to run it in Node.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/theme-init.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');

function run(stored: string | null, prefersDark = false) {
  const store = new Map<string, string>();
  if (stored !== null) store.set('theme', stored);

  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
  };
  const classes = new Set<string>();
  const documentElement = { dataset: {} as Record<string, string>, classList: { add: (c: string) => classes.add(c) } };
  const doc = { documentElement, addEventListener: vi.fn() };
  const win = { matchMedia: (q: string) => ({ matches: q.includes('dark') ? prefersDark : false }) };

  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'localStorage', 'setTimeout', SRC)(
    win, doc, localStorage, vi.fn()
  );

  return { theme: documentElement.dataset.theme, classes, setItem: localStorage.setItem, store };
}

describe('theme-init', () => {
  it('migrates a stored llama theme to glow and persists it', () => {
    const r = run('llama');
    expect(r.theme).toBe('glow');
    expect(r.setItem).toHaveBeenCalledWith('theme', 'glow');
    expect(r.store.get('theme')).toBe('glow');
  });

  it('passes valid stored themes through untouched', () => {
    expect(run('dark').theme).toBe('dark');
    expect(run('light').theme).toBe('light');
    expect(run('glow').theme).toBe('glow');
  });

  it('falls back to the system preference when nothing is stored', () => {
    expect(run(null, true).theme).toBe('dark');
    expect(run(null, false).theme).toBe('light');
  });

  it('falls back to the system preference for an unrecognised stored value', () => {
    expect(run('banana', true).theme).toBe('dark');
  });

  it('adds the js class so reveal styles can apply', () => {
    expect(run(null).classes.has('js')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/utils/__tests__/theme-init.test.ts
```

Expected: FAIL. The current script has no `llama` → `glow` mapping and never adds a `js` class.

- [ ] **Step 3: Rewrite `public/theme-init.js`**

```js
// Runs before first paint. Sets the theme attribute to avoid a flash, adds the
// `js` class that gates all reveal styling, and migrates the retired `llama`
// theme id to `glow`. Kept dependency-free and non-module so it can be inlined.
(function () {
  var LEGACY = { llama: 'glow' };
  var VALID = { light: 1, dark: 1, glow: 1 };

  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { stored = null; }

  if (stored && LEGACY[stored]) {
    stored = LEGACY[stored];
    try { localStorage.setItem('theme', stored); } catch (e) { /* private mode */ }
  }
  if (stored && !VALID[stored]) stored = null;

  var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var theme = stored || system;

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.add('js');

  if (theme === 'glow') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        if (typeof window.startSpores === 'function') window.startSpores();
      }, 100);
    });
  }
})();
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/utils/__tests__/theme-init.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Append the dark and glow themes to `src/styles/tokens.css`**

Add below the `:root` block:

```css
/* ---- Bioluminescent Night (dark theme) ----
   Not a dimmed Canopy Daylight. Dark mode is the direction that lost the
   light-theme vote, kept here so it carries its own identity. */
[data-theme="dark"] {
  --color-background: var(--bio-teal-abyss);
  --color-surface: var(--bio-teal-surface);
  --color-surface-raised: #123A47;
  --color-text-primary: #E8F5E0;
  --color-text-secondary: #9DC4AA;
  --color-text-muted: #5FA57F;
  --color-border: #1C5164;
  --color-border-strong: var(--bio-spring);
  --color-accent: var(--bio-light-green);
  --color-accent-contrast: var(--bio-teal-abyss);
  --color-action: var(--bio-glow-yellow);
  --color-action-contrast: var(--bio-teal-abyss);
  --color-canopy: #123A2A;
  --canopy-opacity: 0.5;
  --hero-gradient: radial-gradient(120% 90% at 50% 0%, #12414F 0%, var(--bio-teal-abyss) 70%);
  --shadow-s: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.25);
  --shadow-m: 0 4px 12px rgba(0, 0, 0, 0.35), 0 12px 32px rgba(0, 0, 0, 0.3);
}

/* ---- Glow. The easter-egg third mode, replacing the retired llama theme. ---- */
[data-theme="glow"] {
  --color-background: #06131A;
  --color-surface: #0A2028;
  --color-surface-raised: #103C49;
  --color-text-primary: var(--bio-light-green);
  --color-text-secondary: #8FD9B4;
  --color-text-muted: #5E9A86;
  --color-border: #1C4D5C;
  --color-border-strong: var(--bio-glow-yellow);
  --color-accent: var(--bio-glow-yellow);
  --color-accent-contrast: #06131A;
  --color-action: var(--bio-light-green);
  --color-action-contrast: #06131A;
  --color-canopy: #0D2E24;
  --canopy-opacity: 0.65;
  --hero-gradient: radial-gradient(120% 90% at 50% 0%, #0F3A47 0%, #06131A 72%);
  --shadow-s: 0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-m: 0 4px 12px rgba(0, 0, 0, 0.45), 0 12px 32px rgba(0, 0, 0, 0.35);
}
```

- [ ] **Step 6: Append the archive override, unchanged from the current file**

These blocks must come **after** the theme blocks so they win the cascade on archive pages. Values are copied verbatim from the pre-reskin `global.css` — do not modernise them.

```css
/* Archived seasons keep their original identity. 2025-26 was red-on-white.
   Colours only: the archive inherits the new type and layout deliberately,
   because a page still running Oswald beside a redesigned page reads as a bug. */
[data-season="2025-26"] {
  --color-accent-red: #dc2626;
  --color-accent: var(--color-accent-red);
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-surface-raised: #ffffff;
  --color-text-primary: #1f2937;
  --color-text-secondary: #374151;
  --color-text-muted: #6b7280;
  --color-border: #9ca3af;
  --color-border-strong: #6b7280;
  --color-accent-contrast: #ffffff;
  --color-action: #dc2626;
  --color-action-contrast: #ffffff;
  --color-light-gray: #f3f4f6;
  --color-medium-gray: #6b7280;
  --canopy-opacity: 0;
  --hero-gradient: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
}

[data-season="2025-26"][data-theme="dark"] {
  --color-accent: #ff3333;
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-surface-raised: #374151;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-muted: #9ca3af;
  --color-border: #374151;
  --color-border-strong: #6b7280;
  --hero-gradient: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}
```

`--canopy-opacity: 0` is what keeps foliage art out of the archive without the archive pages needing to know the `Canopy` component exists.

- [ ] **Step 7: Update `src/components/ThemeToggle.astro`**

Four changes to the existing file:

1. In the markup, replace `<div class="llama-icon">🦙</div>` with `<div class="glow-icon">✨</div>` and change the button `title` to `"Toggle between light, dark, and glow mode"`.
2. In the script, rename `startLlamaRain` → `startSpores`, `stopLlamaRain` → `stopSpores`, `window.llamaRainInterval` → `window.sporeInterval`, element id `llama-rain` → `spore-field`, class `llama-rain` → `spore-field`, class `falling-llama` → `spore`, and `llama.textContent = '🦙'` → `spore.textContent = '✦'`. Update the two `window.*` assignments at the bottom to match.
3. In the `switch`, change `case 'dark': next = 'llama'` to `next = 'glow'` and `case 'llama':` to `case 'glow':`. Change the post-toggle condition to `if (next === 'glow') startSpores(); else stopSpores();`.
4. In the styles, replace every `[data-theme="llama"]` selector with `[data-theme="glow"]`, rename `.llama-icon` to `.glow-icon`, and replace the `.falling-llama` rule set with:

```css
  :global(.spore) {
    position: absolute;
    top: -40px;
    font-size: 20px;
    line-height: 1;
    color: var(--bio-light-green);
    text-shadow: 0 0 12px rgba(195, 227, 154, 0.9);
    animation: drift linear forwards;
    pointer-events: none;
  }

  @keyframes drift {
    from { transform: translateY(-40px) translateX(0); opacity: 0; }
    10%  { opacity: 1; }
    to   { transform: translateY(calc(100vh + 40px)) translateX(40px); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.spore-field) { display: none; }
    .glow-icon { animation: none; }
  }
```

Delete the `:global(.falling-llama:nth-child(odd))` rule and the `@keyframes spin` block — spores drift, they do not spin.

- [ ] **Step 8: Run the full suite and build**

```bash
npm test && npm run build
```

Expected: 56 tests passing (51 baseline + 5 new); build exits 0.

- [ ] **Step 9: Verify all three themes in the browser**

Load the homepage and click the theme toggle three times, confirming the cycle is light → dark → glow → light, that spores fall only in glow, and that a page reload preserves the selected theme. Then set `localStorage.setItem('theme','llama')` in the console, reload, and confirm the page comes back in **glow** with `localStorage.getItem('theme') === 'glow'`.

Finally load `/2025/` and confirm it renders red-on-white in light mode and brighter-red-on-near-black in dark mode.

- [ ] **Step 10: Commit**

```bash
git add src/styles/tokens.css public/theme-init.js src/components/ThemeToggle.astro src/utils/__tests__/theme-init.test.ts
git commit -m "feat: add Bioluminescent Night and Glow themes, retire the llama theme"
```

---

## Task 3: Motion system

**Files:**
- Create: `src/scripts/motion.ts`
- Modify: `src/styles/motion.css`, `src/components/Layout.astro`
- Test: `src/scripts/__tests__/motion.test.ts`

**Interfaces:**
- Consumes: `--dur-slow`, `--ease-out` from Task 1
- Produces: `motionEnabled(): boolean` and `initMotion(): void` exported from `src/scripts/motion.ts`. Markup contract for all later tasks: `data-reveal` on any element that should fade and rise on entry, optional `data-reveal-delay="1"`–`"4"` for stagger, and `data-parallax="<rate>"` where rate is a signed decimal (positive drifts down, negative drifts up).

`initMotion()` is exported rather than run on import so the module has no import side effects and stays testable.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/__tests__/motion.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { motionEnabled } from '../motion';

const original = globalThis.window;

function stubWindow(reduce: boolean, withObserver = true) {
  (globalThis as any).window = {
    matchMedia: (q: string) => ({ matches: q.includes('reduce') ? reduce : false }),
  };
  (globalThis as any).IntersectionObserver = withObserver ? function () {} : undefined;
}

afterEach(() => {
  (globalThis as any).window = original;
  delete (globalThis as any).IntersectionObserver;
});

describe('motionEnabled', () => {
  it('is true when motion is allowed and IntersectionObserver exists', () => {
    stubWindow(false);
    expect(motionEnabled()).toBe(true);
  });

  it('is false when the user prefers reduced motion', () => {
    stubWindow(true);
    expect(motionEnabled()).toBe(false);
  });

  it('is false when IntersectionObserver is unavailable', () => {
    stubWindow(false, false);
    expect(motionEnabled()).toBe(false);
  });

  it('is false during server-side rendering', () => {
    (globalThis as any).window = undefined;
    expect(motionEnabled()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/scripts/__tests__/motion.test.ts
```

Expected: FAIL — cannot resolve `../motion`.

- [ ] **Step 3: Create `src/scripts/motion.ts`**

```ts
/**
 * Scroll motion. One IntersectionObserver for reveals, one throttled rAF
 * handler for parallax, both behind a single gate.
 *
 * Contract: never required for comprehension. Reveal styling is scoped to
 * `html.js` in CSS, so without JavaScript nothing is hidden in the first place;
 * when motion is disabled here, elements are marked visible immediately and no
 * scroll listener is ever attached.
 */

export function motionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof IntersectionObserver === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealAll(): void {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

function initReveals(): void {
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
  );

  targets.forEach((el) => observer.observe(el));
}

function initParallax(): void {
  const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (layers.length === 0) return;

  const active = new Set<HTMLElement>();
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          active.add(el);
          el.style.willChange = 'transform';
        } else {
          active.delete(el);
          el.style.willChange = '';
        }
      }
    },
    { rootMargin: '20% 0px' }
  );
  layers.forEach((el) => visibility.observe(el));

  let queued = false;
  const apply = () => {
    queued = false;
    const mid = window.innerHeight / 2;
    for (const el of active) {
      const rate = parseFloat(el.dataset.parallax ?? '0');
      if (!rate) continue;
      const offset = (el.getBoundingClientRect().top - mid) * rate;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  apply();
}

export function initMotion(): void {
  if (!motionEnabled()) {
    revealAll();
    return;
  }
  initReveals();
  initParallax();
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/scripts/__tests__/motion.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Fill in `src/styles/motion.css`**

Replace the placeholder with:

```css
/* Motion layer.
   Reveal styling is scoped to html.js — set by public/theme-init.js before
   first paint — so a visitor without JavaScript never has content hidden. */

html.js [data-reveal] {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}

html.js [data-reveal].is-visible {
  opacity: 1;
  transform: none;
}

html.js [data-reveal-delay="1"] { transition-delay: 70ms; }
html.js [data-reveal-delay="2"] { transition-delay: 140ms; }
html.js [data-reveal-delay="3"] { transition-delay: 210ms; }
html.js [data-reveal-delay="4"] { transition-delay: 280ms; }

[data-parallax] {
  will-change: auto;
  pointer-events: none;
}

/* The declarative half of the reduced-motion guarantee. motion.ts enforces the
   same thing imperatively; both are needed, because the media query can flip
   after init. */
@media (prefers-reduced-motion: reduce) {
  html.js [data-reveal],
  html.js [data-reveal].is-visible {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    transition-delay: 0ms !important;
  }

  [data-parallax] {
    transform: none !important;
  }

  html { scroll-behavior: auto !important; }

  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 6: Wire it into `src/components/Layout.astro`**

Add immediately before the closing `</body>` tag:

```astro
    <script>
      import { initMotion } from '../scripts/motion';
      initMotion();
    </script>
```

- [ ] **Step 7: Verify in the browser**

Add `data-reveal` temporarily to the homepage `.hero-title`, reload, and confirm it fades and rises. Then enable reduced motion at the OS level (macOS: System Settings → Accessibility → Display → Reduce motion), reload, and confirm the title is immediately visible with no transition. Remove the temporary attribute afterwards.

- [ ] **Step 8: Run the full suite, build, and commit**

```bash
npm test && npm run build
git add src/scripts src/styles/motion.css src/components/Layout.astro
git commit -m "feat: add the scroll motion system with a reduced-motion gate"
```

Expected before commit: 60 tests passing; build exits 0.

---

## Task 4: Canopy foliage component

**Files:**
- Create: `src/components/Canopy.astro`

**Interfaces:**
- Consumes: `--color-canopy`, `--canopy-opacity` from Task 1; the `data-parallax` contract from Task 3
- Produces: `<Canopy variant="top" | "bottom" | "sparse" rate={number} class?={string} />`. Later tasks place it inside any element with `position: relative; overflow: hidden`.

There is no unit test — this is presentational SVG. Its gate is visual, plus the archive check that `--canopy-opacity: 0` suppresses it.

- [ ] **Step 1: Create `src/components/Canopy.astro`**

```astro
---
/**
 * Decorative foliage silhouette. Purely presentational — aria-hidden, no text,
 * never load-bearing for comprehension.
 *
 * Placement: the host element needs `position: relative` and `overflow: hidden`.
 * Opacity comes from --canopy-opacity, which the archive theme sets to 0, so
 * archive pages suppress foliage without knowing this component exists.
 */
export interface Props {
  /** top = leaf cluster hanging from above; bottom = undergrowth rising from below; sparse = a light diagonal frond. */
  variant?: 'top' | 'bottom' | 'sparse';
  /** Parallax rate. Positive drifts down, negative drifts up. 0 disables. */
  rate?: number;
  class?: string;
}

const { variant = 'top', rate = 0, class: className = '' } = Astro.props;
---

<svg
  class:list={['canopy', `canopy--${variant}`, className]}
  data-parallax={rate !== 0 ? String(rate) : undefined}
  viewBox={variant === 'top' ? '0 0 200 46' : '0 0 200 44'}
  preserveAspectRatio="none"
  aria-hidden="true"
  focusable="false"
>
  {variant === 'top' && (
    <g fill="var(--color-canopy)">
      <ellipse cx="18" cy="0" rx="36" ry="17" />
      <ellipse cx="78" cy="-6" rx="42" ry="19" />
      <ellipse cx="142" cy="1" rx="35" ry="16" />
      <ellipse cx="192" cy="-4" rx="32" ry="18" />
    </g>
  )}
  {variant === 'bottom' && (
    <path
      fill="var(--color-canopy)"
      d="M0 44 C26 18 48 31 72 15 C96 2 122 20 148 9 C172 0 186 18 200 9 L200 44Z"
    />
  )}
  {variant === 'sparse' && (
    <path
      fill="var(--color-canopy)"
      d="M0 0 C30 21 56 8 84 23 C110 35 138 17 166 27 C182 33 192 23 200 29 L200 0Z"
    />
  )}
</svg>

<style>
  .canopy {
    position: absolute;
    left: -6%;
    width: 112%;
    opacity: var(--canopy-opacity);
    pointer-events: none;
    z-index: 0;
  }

  .canopy--top { top: -14px; }
  .canopy--bottom { bottom: -6px; }
  .canopy--sparse { top: -10px; opacity: calc(var(--canopy-opacity) * 0.6); }
</style>
```

- [ ] **Step 2: Verify, then commit**

Temporarily drop `<Canopy variant="top" rate={0.3} />` into the homepage hero (which already has a gradient background), confirm it renders behind the text and drifts on scroll, then confirm it is invisible on `/2025/`. Remove the temporary usage.

```bash
npm run build
git add src/components/Canopy.astro
git commit -m "feat: add the parallax canopy foliage component"
```

---

## Task 5: Milestone field and timeline derivation

**Files:**
- Create: `src/utils/timeline.ts`
- Modify: `src/content/config.ts:20-40`, and five files under `src/content/meetings/`
- Test: `src/utils/__tests__/timeline.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `deriveMilestones(meetings, now?): Milestone[]` where `Milestone` is `{ slug: string; label: string; title: string; date: Date; done: boolean }`. Task 8's `SeasonTimeline.astro` is the only consumer.

Milestones are marked explicitly rather than inferred. 15 of the 21 meetings this season share the exact title `"FIRST LEGO League Meeting"` and the collection has no `type` field, so any title-matching rule would be brittle.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/timeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveMilestones } from '../timeline';

const NOW = new Date('2026-10-01T12:00:00-07:00');

function meeting(slug: string, date: string, title: string, milestone?: string) {
  return { slug, data: { title, date: new Date(`${date}T12:00:00-07:00`), milestone } };
}

describe('deriveMilestones', () => {
  it('keeps only meetings carrying a milestone label, in date order', () => {
    const result = deriveMilestones(
      [
        meeting('tournament', '2026-12-05', 'Piedmont Makers Community Tournament', 'Tournament'),
        meeting('sunday-a', '2026-08-23', 'FIRST LEGO League Meeting'),
        meeting('kickoff', '2026-08-16', 'Season Kickoff — BIOGLOW', 'Kickoff'),
        meeting('sunday-b', '2026-09-06', 'FIRST LEGO League Meeting'),
      ],
      NOW
    );

    expect(result.map((m) => m.label)).toEqual(['Kickoff', 'Tournament']);
    expect(result.map((m) => m.slug)).toEqual(['kickoff', 'tournament']);
  });

  it('marks milestones on or before now as done', () => {
    const result = deriveMilestones(
      [
        meeting('kickoff', '2026-08-16', 'Season Kickoff — BIOGLOW', 'Kickoff'),
        meeting('tournament', '2026-12-05', 'Piedmont Makers Community Tournament', 'Tournament'),
      ],
      NOW
    );

    expect(result.map((m) => m.done)).toEqual([true, false]);
  });

  it('returns nothing when fewer than two milestones resolve', () => {
    expect(deriveMilestones([meeting('kickoff', '2026-08-16', 'Kickoff', 'Kickoff')], NOW)).toEqual([]);
    expect(deriveMilestones([], NOW)).toEqual([]);
  });

  it('ignores blank and whitespace-only milestone labels', () => {
    const result = deriveMilestones(
      [
        meeting('a', '2026-08-16', 'A', 'Kickoff'),
        meeting('b', '2026-09-06', 'B', '   '),
        meeting('c', '2026-12-05', 'C', ''),
        meeting('d', '2026-12-13', 'D', 'Celebration'),
      ],
      NOW
    );

    expect(result.map((m) => m.label)).toEqual(['Kickoff', 'Celebration']);
  });

  it('trims surrounding whitespace from labels', () => {
    const result = deriveMilestones(
      [
        meeting('a', '2026-08-16', 'A', '  Kickoff  '),
        meeting('b', '2026-12-05', 'B', 'Tournament'),
      ],
      NOW
    );

    expect(result[0].label).toBe('Kickoff');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/utils/__tests__/timeline.test.ts
```

Expected: FAIL — cannot resolve `../timeline`.

- [ ] **Step 3: Create `src/utils/timeline.ts`**

```ts
/**
 * Season timeline derivation. Kept free of Astro's content runtime so it is
 * testable, matching the filterBySeason / getSeasonContent split in utils/season.ts.
 */

export interface Milestone {
  slug: string;
  label: string;
  title: string;
  date: Date;
  done: boolean;
}

interface MilestoneInput {
  slug: string;
  data: { title: string; date: Date; milestone?: string };
}

/** Minimum milestones worth drawing a rail for. Below this the section is omitted. */
const MIN_MILESTONES = 2;

/**
 * Extract explicitly-marked milestones in date order.
 *
 * Milestones are opt-in via the `milestone` frontmatter field, never inferred
 * from titles: 15 of this season's meetings share the title "FIRST LEGO League
 * Meeting", so title matching would be both wrong and fragile.
 */
export function deriveMilestones(meetings: MilestoneInput[], now: Date = new Date()): Milestone[] {
  const marked = meetings
    .filter((m) => typeof m.data.milestone === 'string' && m.data.milestone.trim() !== '')
    .map((m) => ({
      slug: m.slug,
      label: m.data.milestone!.trim(),
      title: m.data.title,
      date: m.data.date,
      done: m.data.date.getTime() <= now.getTime(),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return marked.length < MIN_MILESTONES ? [] : marked;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/utils/__tests__/timeline.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Add the schema field**

In `src/content/config.ts`, inside the `meetings` collection schema, add this line directly after `timeTBD`:

```ts
    milestone: z.string().optional(), // short timeline label; absent = not a milestone
```

Optional by design — the 2025-26 archive meetings must stay valid without edits.

- [ ] **Step 6: Add `milestone` to exactly five meeting files**

Add the frontmatter key to each. Change nothing else in these files.

| File | Line to add |
|---|---|
| `src/content/meetings/2026-08-16-season-kickoff.md` | `milestone: "Kickoff"` |
| `src/content/meetings/2026-10-24-practice-tournament-robot-game.md` | `milestone: "Practice 1"` |
| `src/content/meetings/2026-11-14-practice-tournament-innovation.md` | `milestone: "Practice 2"` |
| `src/content/meetings/2026-12-05-piedmont-makers-tournament.md` | `milestone: "Tournament"` |
| `src/content/meetings/2026-12-13-celebration.md` | `milestone: "Celebration"` |

Do **not** add it to `2026-09-14-coach-check-in.md` or any `*-sunday-session.md`.

- [ ] **Step 7: Confirm exactly five meetings are marked**

```bash
grep -l "^milestone:" src/content/meetings/*.md | wc -l
```

Expected: `5`.

- [ ] **Step 8: Run the full suite, build, and commit**

```bash
npm test && npm run build
git add src/utils/timeline.ts src/utils/__tests__/timeline.test.ts src/content/config.ts src/content/meetings/
git commit -m "feat: mark season milestones explicitly and derive the timeline"
```

Expected before commit: 65 tests passing; build exits 0.

---

## Task 6: Photo strip selection

**Files:**
- Create: `src/utils/photo-strip.ts`
- Test: `src/utils/__tests__/photo-strip.test.ts`

**Interfaces:**
- Consumes: the shape of `src/data/photo-manifest.json` — `{ photosByMeeting: Record<string, Array<{ filename, thumbnail, fullImage, dateFound, uploadedAt }>> }`
- Produces: `selectStripPhotos(manifest, seasonMeetingDates, limit?): StripPhoto[]` where `StripPhoto` is `{ thumbnail: string; fullImage: string; meetingDate: string }`. Task 8's `PhotoStrip.astro` is the only consumer.

Only one 2026-27 meeting (`2026-08-16`) currently has photos, so the below-threshold path is the live one today and must be right.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/photo-strip.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectStripPhotos } from '../photo-strip';

function photos(n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({
    filename: `${prefix}-${i}.jpg`,
    thumbnail: `https://cdn.test/${prefix}/thumb_${i}.jpg`,
    fullImage: `https://cdn.test/${prefix}/${i}.jpg`,
    dateFound: '2026-08-16',
    uploadedAt: '2026-08-17T01:00:00.000Z',
  }));
}

const SEASON_DATES = ['2026-08-16', '2026-08-23', '2026-08-30'];

describe('selectStripPhotos', () => {
  it('returns nothing below three photos, so the section is absent rather than sparse', () => {
    const manifest = { photosByMeeting: { '2026-08-16': photos(2, 'a') } };
    expect(selectStripPhotos(manifest, SEASON_DATES)).toEqual([]);
  });

  it('returns photos once three are available', () => {
    const manifest = { photosByMeeting: { '2026-08-16': photos(3, 'a') } };
    const result = selectStripPhotos(manifest, SEASON_DATES);
    expect(result).toHaveLength(3);
    expect(result[0].thumbnail).toBe('https://cdn.test/a/thumb_0.jpg');
    expect(result[0].meetingDate).toBe('2026-08-16');
  });

  it('excludes meetings outside the given season, so archive photos never leak', () => {
    const manifest = {
      photosByMeeting: {
        '2025-10-19': photos(8, 'old'),
        '2026-08-16': photos(2, 'new'),
      },
    };
    expect(selectStripPhotos(manifest, SEASON_DATES)).toEqual([]);
  });

  it('orders the most recent meeting first', () => {
    const manifest = {
      photosByMeeting: {
        '2026-08-16': photos(2, 'early'),
        '2026-08-30': photos(2, 'late'),
      },
    };
    const result = selectStripPhotos(manifest, SEASON_DATES);
    expect(result.map((p) => p.meetingDate)).toEqual([
      '2026-08-30', '2026-08-30', '2026-08-16', '2026-08-16',
    ]);
  });

  it('caps the result at the limit', () => {
    const manifest = { photosByMeeting: { '2026-08-16': photos(20, 'a') } };
    expect(selectStripPhotos(manifest, SEASON_DATES, 6)).toHaveLength(6);
  });

  it('tolerates a manifest with no photosByMeeting key', () => {
    expect(selectStripPhotos({}, SEASON_DATES)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/utils/__tests__/photo-strip.test.ts
```

Expected: FAIL — cannot resolve `../photo-strip`.

- [ ] **Step 3: Create `src/utils/photo-strip.ts`**

```ts
/**
 * Homepage photo strip selection. Pure, so it is testable without the R2
 * manifest or Astro's content runtime.
 */

export interface StripPhoto {
  thumbnail: string;
  fullImage: string;
  meetingDate: string;
}

interface ManifestPhoto {
  thumbnail: string;
  fullImage: string;
}

interface Manifest {
  photosByMeeting?: Record<string, ManifestPhoto[]>;
}

/**
 * Below this many photos the strip renders nothing at all. A homepage section
 * showing one lonely image reads as broken; an absent section reads as
 * intentional, and the strip fills in on its own as the season goes.
 */
const MIN_PHOTOS = 3;

/**
 * Most recent photos belonging to the given season's meetings.
 *
 * @param manifest        parsed src/data/photo-manifest.json
 * @param seasonMeetingDates  YYYY-MM-DD keys for the current season's meetings
 * @param limit           maximum photos returned
 */
export function selectStripPhotos(
  manifest: Manifest,
  seasonMeetingDates: string[],
  limit = 6
): StripPhoto[] {
  const byMeeting = manifest.photosByMeeting ?? {};
  const allowed = new Set(seasonMeetingDates);

  // ISO date keys sort lexically, so a plain reverse sort is newest-first.
  const keys = Object.keys(byMeeting)
    .filter((date) => allowed.has(date))
    .sort()
    .reverse();

  const selected: StripPhoto[] = [];
  for (const meetingDate of keys) {
    for (const photo of byMeeting[meetingDate] ?? []) {
      if (selected.length >= limit) break;
      selected.push({ thumbnail: photo.thumbnail, fullImage: photo.fullImage, meetingDate });
    }
    if (selected.length >= limit) break;
  }

  return selected.length < MIN_PHOTOS ? [] : selected;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/utils/__tests__/photo-strip.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full suite, build, and commit**

```bash
npm test && npm run build
git add src/utils/photo-strip.ts src/utils/__tests__/photo-strip.test.ts
git commit -m "feat: add photo strip selection with a three-photo floor"
```

Expected before commit: 71 tests passing; build exits 0.

---

## Task 7: Split Hero, meeting card, quick actions

**Files:**
- Create: `src/components/home/NextMeetingCard.astro`, `src/components/home/SplitHero.astro`, `src/components/home/QuickActions.astro`

**Interfaces:**
- Consumes: `Canopy` (Task 4), tokens (Task 1), the `data-reveal` contract (Task 3), `getSeasonContent` from `src/utils/season`, `getMeetingDateTime` from `src/utils/calendar`, `formatMeetingTimeOrTBD` from `src/utils/meeting-time`, `getCurrentSeason` from `src/config/season`
- Produces: `<SplitHero />`, `<NextMeetingCard />`, `<QuickActions />`, all prop-free. Task 8 assembles them.

`NextMeetingCard` reuses the exact meeting-resolution approach already proven in `NextMeetingBanner.astro:6-39` — the same `getMeetingDateTime` call and the same Pacific-time formatters — rather than inventing a second date path.

- [ ] **Step 1: Create `src/components/home/NextMeetingCard.astro`**

```astro
---
/**
 * The green card in the split hero. The single most important object on the
 * site: a parent should be able to answer "when, where, and have I replied?"
 * without scrolling.
 *
 * Date resolution mirrors NextMeetingBanner.astro so there is exactly one way
 * meeting times are computed.
 */
import { formatMeetingTimeOrTBD } from '../../utils/meeting-time.ts';
import { getMeetingDateTime } from '../../utils/calendar.ts';
import { getSeasonContent } from '../../utils/season';
import { getCurrentSeason } from '../../config/season';

const season = getCurrentSeason();
const meetingsRaw = await getSeasonContent('meetings');

const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' });
const fmtDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'America/Los_Angeles',
});

const now = new Date();
const next = meetingsRaw
  .map((m) => {
    const { date } = getMeetingDateTime(m.data.date, m.data.startTime, m.data.duration);
    return { ...m, _date: date };
  })
  .filter((m) => m._date >= now)
  .sort((a, b) => a._date.getTime() - b._date.getTime())[0] ?? null;

const location = next?.data.location ?? season.defaults.location;
---

<div class="meeting-card" data-reveal data-reveal-delay="1">
  {next ? (
    <>
      <span class="eyebrow meeting-card__eyebrow">Next meeting</span>
      <p class="meeting-card__date">
        <time datetime={fmtISO.format(next._date)}>{fmtDay.format(next._date)}</time>
      </p>
      <p class="meeting-card__time">
        {formatMeetingTimeOrTBD(next.data.startTime, next.data.duration, next.data.timeTBD)}
      </p>
      <p class="meeting-card__where">{location}</p>
      <div class="meeting-card__actions">
        <a href="/rsvps" class="btn-action">RSVP</a>
        <a href={`/meetings/${next.slug}/`} class="btn-quiet">Details</a>
      </div>
    </>
  ) : (
    <>
      <span class="eyebrow meeting-card__eyebrow">Season status</span>
      <p class="meeting-card__date">No meetings scheduled</p>
      <p class="meeting-card__where">
        The {season.challenge} season calendar is up to date. Check back for the next date.
      </p>
      <div class="meeting-card__actions">
        <a href="/calendar" class="btn-action">View calendar</a>
      </div>
    </>
  )}
</div>

<style>
  .meeting-card {
    background-color: var(--color-accent);
    color: var(--color-accent-contrast);
    border-radius: var(--radius-l);
    padding: var(--space-m);
    box-shadow: var(--shadow-m);
  }

  .meeting-card__eyebrow {
    color: var(--color-accent-contrast);
    opacity: 0.75;
    margin-bottom: var(--space-2xs);
  }

  .meeting-card__date {
    font-family: var(--font-heading-primary);
    font-size: var(--step-2);
    font-weight: 700;
    line-height: 1.1;
    color: var(--color-accent-contrast);
    margin: 0 0 var(--space-3xs);
    font-variation-settings: 'opsz' 60, 'SOFT' 30;
  }

  .meeting-card__time {
    font-family: var(--font-mono);
    font-size: var(--step--1);
    color: var(--color-accent-contrast);
    margin: 0 0 var(--space-2xs);
  }

  .meeting-card__where {
    font-size: var(--step--1);
    color: var(--color-accent-contrast);
    opacity: 0.8;
    margin: 0 0 var(--space-s);
    max-width: none;
  }

  .meeting-card__actions {
    display: flex;
    gap: var(--space-2xs);
    flex-wrap: wrap;
  }

  .btn-action,
  .btn-quiet {
    font-family: var(--font-body);
    font-size: var(--step--1);
    font-weight: 700;
    padding: var(--space-2xs) var(--space-s);
    border-radius: var(--radius-pill);
    text-decoration: none;
    transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
  }

  .btn-action {
    background-color: var(--color-action);
    color: var(--color-action-contrast);
  }

  .btn-quiet {
    background-color: transparent;
    color: var(--color-accent-contrast);
    border: 1.5px solid currentColor;
  }

  .btn-action:hover,
  .btn-quiet:hover,
  .btn-action:focus,
  .btn-quiet:focus {
    transform: translateY(-2px);
    text-decoration: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-action:hover,
    .btn-quiet:hover { transform: none; }
  }
</style>
```

- [ ] **Step 2: Create `src/components/home/SplitHero.astro`**

```astro
---
/**
 * First screen. Identity left, logistics right. On narrow viewports the columns
 * stack with the meeting card FIRST — the parent-first constraint outranks the
 * introduction on a phone.
 */
import Canopy from '../Canopy.astro';
import NextMeetingCard from './NextMeetingCard.astro';
import { getCurrentSeason } from '../../config/season';

const season = getCurrentSeason();
---

<section class="hero">
  <Canopy variant="top" rate={0.28} />
  <Canopy variant="bottom" rate={-0.16} />

  <div class="hero__inner">
    <div class="hero__identity">
      <span class="eyebrow" data-reveal>Season {season.id} · {season.challenge}</span>
      <h1 class="hero__title" data-reveal>{season.teamName}</h1>
      <p class="hero__lede" data-reveal data-reveal-delay="1">
        A FIRST LEGO League team from the Piedmont Makers Club. We meet on Sundays in
        Moraga to build, code, and compete — this season on bioluminescence, ecosystems,
        and the science of keeping them lit.
      </p>
    </div>

    <div class="hero__logistics">
      <NextMeetingCard />
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    background: var(--hero-gradient);
    padding: var(--space-2xl) 0 var(--space-xl);
  }

  .hero__inner {
    position: relative;
    z-index: 1;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--content-padding);
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-l);
    align-items: center;
  }

  .hero__title {
    font-size: var(--step-5);
    margin-bottom: var(--space-s);
  }

  .hero__lede {
    font-size: var(--step-1);
    color: var(--color-text-secondary);
    max-width: 40ch;
    margin-bottom: 0;
  }

  /* Meeting card first on phones. Identity is the nice-to-have there. */
  .hero__logistics { order: -1; }

  @media (min-width: 860px) {
    .hero { padding: var(--space-3xl) 0 var(--space-2xl); }

    .hero__inner {
      grid-template-columns: 1.15fr 0.85fr;
      gap: var(--space-xl);
    }

    .hero__logistics { order: 0; }
  }
</style>
```

- [ ] **Step 3: Create `src/components/home/QuickActions.astro`**

```astro
---
/**
 * The three things a parent does that are not "check the next meeting".
 * Deliberately three: a longer row stops being scannable.
 */
const actions = [
  { href: '/snacks', label: 'Snack duty', hint: 'Who is bringing what' },
  { href: '/calendar', label: 'Calendar', hint: 'Every date this season' },
  { href: '/newsletters', label: 'Newsletters', hint: 'What happened last week' },
];
---

<nav class="quick" aria-label="Quick actions">
  {actions.map((action, i) => (
    <a href={action.href} class="quick__item" data-reveal data-reveal-delay={String(i + 1)}>
      <span class="quick__label">{action.label}</span>
      <span class="quick__hint">{action.hint}</span>
    </a>
  ))}
</nav>

<style>
  .quick {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-l) var(--content-padding) 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-2xs);
  }

  .quick__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    background-color: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-m);
    padding: var(--space-s) var(--space-m);
    text-decoration: none;
    transition:
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }

  .quick__item:hover,
  .quick__item:focus {
    border-color: var(--color-border-strong);
    transform: translateY(-2px);
    text-decoration: none;
  }

  .quick__label {
    font-family: var(--font-heading-primary);
    font-size: var(--step-0);
    font-weight: 700;
    color: var(--color-accent);
  }

  .quick__hint {
    font-size: var(--step--1);
    color: var(--color-text-muted);
  }

  @media (min-width: 720px) {
    .quick { grid-template-columns: repeat(3, 1fr); gap: var(--space-s); }
  }

  @media (prefers-reduced-motion: reduce) {
    .quick__item:hover { transform: none; }
  }
</style>
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/components/home
git commit -m "feat: add the split hero, meeting card, and quick actions"
```

These are not yet referenced by any page, so the build only proves they compile. Task 8 wires them up and is where they get looked at.

---

## Task 8: Timeline, photo strip, and homepage assembly

**Files:**
- Create: `src/components/home/SeasonTimeline.astro`, `src/components/home/PhotoStrip.astro`
- Rewrite: `src/pages/index.astro`

**Interfaces:**
- Consumes: everything from Tasks 1–7, plus `deriveMilestones` (Task 5) and `selectStripPhotos` (Task 6)
- Produces: the finished homepage

- [ ] **Step 1: Create `src/components/home/SeasonTimeline.astro`**

```astro
---
import { getSeasonContent } from '../../utils/season';
import { deriveMilestones } from '../../utils/timeline';

const meetings = await getSeasonContent('meetings');
const milestones = deriveMilestones(
  meetings.map((m) => ({ slug: m.slug, data: m.data as any }))
);

const doneCount = milestones.filter((m) => m.done).length;
// Fill reaches the last completed dot, not past it.
const fillPercent =
  milestones.length > 1 && doneCount > 0
    ? ((doneCount - 1) / (milestones.length - 1)) * 100
    : 0;
---

{milestones.length > 0 && (
  <section class="timeline" aria-labelledby="timeline-heading">
    <div class="timeline__inner">
      <h2 id="timeline-heading" class="timeline__heading" data-reveal>The season</h2>

      <ol class="timeline__rail" style={`--fill:${fillPercent}%`}>
        {milestones.map((m, i) => (
          <li class:list={['timeline__stop', { 'is-done': m.done }]} data-reveal data-reveal-delay={String(Math.min(i + 1, 4))}>
            <a href={`/meetings/${m.slug}/`} class="timeline__link">
              <span class="timeline__dot" aria-hidden="true"></span>
              <span class="timeline__label">{m.label}</span>
              <time class="timeline__date" datetime={m.date.toISOString().slice(0, 10)}>
                {m.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}
              </time>
            </a>
          </li>
        ))}
      </ol>
    </div>
  </section>
)}

<style>
  .timeline { padding: var(--space-2xl) 0; }

  .timeline__inner {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--content-padding);
  }

  .timeline__heading { margin-bottom: var(--space-l); }

  .timeline__rail {
    list-style: none;
    padding: var(--space-s) 0 0;
    margin: 0;
    display: grid;
    gap: var(--space-s);
    position: relative;
  }

  .timeline__stop { margin: 0; }

  .timeline__link {
    display: flex;
    align-items: baseline;
    gap: var(--space-2xs);
    text-decoration: none;
    color: var(--color-text-secondary);
  }

  .timeline__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--color-border);
    flex-shrink: 0;
    transition: background-color var(--dur-base) var(--ease-out);
  }

  .is-done .timeline__dot {
    background-color: var(--color-action);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-action) 25%, transparent);
  }

  .timeline__label {
    font-family: var(--font-heading-primary);
    font-weight: 700;
    color: var(--color-accent);
  }

  .timeline__date {
    font-family: var(--font-mono);
    font-size: var(--step--2);
    color: var(--color-text-muted);
  }

  /* Horizontal rail once there is room for one. */
  @media (min-width: 760px) {
    .timeline__rail {
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 0;
      padding-top: var(--space-m);
    }

    .timeline__rail::before,
    .timeline__rail::after {
      content: '';
      position: absolute;
      top: var(--space-m);
      height: 3px;
      border-radius: 2px;
    }

    .timeline__rail::before {
      left: 0;
      right: 0;
      background-color: var(--color-border);
    }

    .timeline__rail::after {
      left: 0;
      width: var(--fill, 0%);
      background-color: var(--color-accent);
      transition: width var(--dur-slow) var(--ease-out);
    }

    .timeline__link {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3xs);
      padding-right: var(--space-s);
    }

    .timeline__dot { margin-top: -6px; }
  }
</style>
```

- [ ] **Step 2: Create `src/components/home/PhotoStrip.astro`**

```astro
---
import manifest from '../../data/photo-manifest.json';
import { getSeasonContent } from '../../utils/season';
import { selectStripPhotos } from '../../utils/photo-strip';

const meetings = await getSeasonContent('meetings');
const seasonDates = meetings.map((m) => m.data.date.toISOString().slice(0, 10));
const photos = selectStripPhotos(manifest as any, seasonDates);
---

{photos.length > 0 && (
  <section class="strip" aria-labelledby="strip-heading">
    <div class="strip__inner">
      <div class="strip__head" data-reveal>
        <h2 id="strip-heading">Recently</h2>
        <a href="/photos" class="strip__all">All photos →</a>
      </div>

      <ul class="strip__grid">
        {photos.map((photo, i) => (
          <li data-reveal data-reveal-delay={String(Math.min(i + 1, 4))}>
            <a href="/photos" class="strip__item">
              <img src={photo.thumbnail} alt={`Team photo from ${photo.meetingDate}`} loading="lazy" decoding="async" width="400" height="300" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  </section>
)}

<style>
  .strip { padding: var(--space-2xl) 0; }

  .strip__inner {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--content-padding);
  }

  .strip__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-s);
    margin-bottom: var(--space-m);
  }

  .strip__head h2 { margin-bottom: 0; }

  .strip__all {
    font-family: var(--font-mono);
    font-size: var(--step--2);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }

  .strip__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2xs);
  }

  .strip__grid li { margin: 0; }

  .strip__item {
    display: block;
    border-radius: var(--radius-m);
    overflow: hidden;
    aspect-ratio: 4 / 3;
  }

  .strip__item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    margin: 0;
    border-radius: 0;
    transition: transform var(--dur-base) var(--ease-out);
  }

  .strip__item:hover img { transform: scale(1.04); }

  @media (min-width: 720px) {
    .strip__grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-s); }
  }

  @media (prefers-reduced-motion: reduce) {
    .strip__item:hover img { transform: none; }
  }
</style>
```

- [ ] **Step 3: Rewrite `src/pages/index.astro`**

Replace the entire file. Note what leaves: the `fs`/`path` imports and `getFileModTime`, the dead `createSmartOrdering` function (defined and never called), and the six feature cards.

```astro
---
import Layout from '../components/Layout.astro';
import SplitHero from '../components/home/SplitHero.astro';
import QuickActions from '../components/home/QuickActions.astro';
import SeasonTimeline from '../components/home/SeasonTimeline.astro';
import PhotoStrip from '../components/home/PhotoStrip.astro';
import Canopy from '../components/Canopy.astro';
import { getSeasonContent } from '../utils/season';
import { getCurrentSeason } from '../config/season';

const season = getCurrentSeason();

const blogPosts = (await getSeasonContent('blog')).filter(({ data }) => data.draft !== true);
const meetings = await getSeasonContent('meetings');
const newsletters = (await getSeasonContent('newsletter')).filter(({ data }) => data.draft !== true);

const TYPE_LABEL = { blog: 'Blog post', meeting: 'Meeting notes', newsletter: 'Newsletter' } as const;

const now = new Date();
const recentContent = [
  ...blogPosts.map((p) => ({ ...p, type: 'blog' as const, url: `/blog/${p.slug}/` })),
  ...meetings.map((m) => ({ ...m, type: 'meeting' as const, url: `/meetings/${m.slug}/` })),
  ...newsletters.map((n) => ({ ...n, type: 'newsletter' as const, url: `/newsletters/${n.slug}/` })),
]
  .filter((item) => item.data.date <= now)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 3);

const fmtDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  timeZone: 'America/Los_Angeles',
});

const work = [
  {
    title: 'Robot design',
    body: 'Building and programming a LEGO robot to run missions on the competition mat — chassis, attachments, and the code that drives them.',
  },
  {
    title: 'Innovation project',
    body: `Researching a real biodiversity problem and prototyping a solution. This season's ${season.challenge} theme is bioluminescence and the ecosystems that depend on it.`,
  },
  {
    title: 'Core values',
    body: 'Discovery, Innovation, Impact, Inclusion, Teamwork, and Fun — judged as seriously as the robot, and the reason the team works at all.',
  },
];
---

<Layout
  title="Piedmont Makers Club FLL Challenge Team"
  description={`Follow the ${season.teamName} through the FIRST LEGO League ${season.challenge} season — meeting notes, robot builds, and competition prep.`}
  showSidebar={false}
>
  <SplitHero />
  <QuickActions />

  <section class="updates" aria-labelledby="updates-heading">
    <div class="shell">
      <div class="updates__head" data-reveal>
        <h2 id="updates-heading">Latest updates</h2>
        <a href="/newsletters" class="updates__all">All newsletters →</a>
      </div>

      {recentContent.length > 0 ? (
        <div class="updates__grid">
          {recentContent.map((item, i) => (
            <article class="card" data-reveal data-reveal-delay={String(Math.min(i + 1, 4))}>
              <span class="eyebrow">{TYPE_LABEL[item.type]}</span>
              <h3 class="card__title"><a href={item.url}>{item.data.title}</a></h3>
              <time class="card__date" datetime={item.data.date.toISOString().slice(0, 10)}>
                {fmtDate.format(item.data.date)}
              </time>
              {item.data.description && <p class="card__excerpt">{item.data.description}</p>}
            </article>
          ))}
        </div>
      ) : (
        <p class="updates__empty">The season is just getting started — updates will appear here after the first meeting.</p>
      )}
    </div>
  </section>

  <SeasonTimeline />

  <section class="work" aria-labelledby="work-heading">
    <Canopy variant="sparse" rate={0.18} />
    <div class="shell">
      <h2 id="work-heading" data-reveal>What we work on</h2>
      <div class="work__grid">
        {work.map((item, i) => (
          <div class="work__card" data-reveal data-reveal-delay={String(Math.min(i + 1, 4))}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <PhotoStrip />
</Layout>

<style>
  .shell {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--content-padding);
    position: relative;
    z-index: 1;
  }

  .updates { padding: var(--space-2xl) 0 0; }

  .updates__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-s);
    margin-bottom: var(--space-m);
  }

  .updates__head h2 { margin-bottom: 0; }

  .updates__all {
    font-family: var(--font-mono);
    font-size: var(--step--2);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }

  .updates__empty { color: var(--color-text-muted); }

  .updates__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }

  .card {
    background-color: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-l);
    padding: var(--space-m);
    transition:
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out);
  }

  .card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-3px);
    box-shadow: var(--shadow-m);
  }

  .card__title { font-size: var(--step-1); margin: var(--space-3xs) 0 var(--space-3xs); }
  .card__title a { color: var(--color-text-primary); }
  .card__title a:hover { color: var(--color-accent); text-decoration: none; }

  .card__date {
    font-family: var(--font-mono);
    font-size: var(--step--2);
    color: var(--color-text-muted);
    display: block;
    margin-bottom: var(--space-2xs);
  }

  .card__excerpt { color: var(--color-text-secondary); font-size: var(--step--1); margin-bottom: 0; }

  .work {
    position: relative;
    overflow: hidden;
    padding: var(--space-2xl) 0;
    background-color: var(--color-surface);
  }

  .work__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-m);
  }

  .work__card h3 { font-size: var(--step-1); margin-bottom: var(--space-2xs); }
  .work__card p { color: var(--color-text-secondary); font-size: var(--step--1); margin-bottom: 0; }

  @media (min-width: 720px) {
    .updates__grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-m); }
    .work__grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-l); }
  }

  @media (prefers-reduced-motion: reduce) {
    .card:hover { transform: none; }
  }
</style>
```

- [ ] **Step 4: Confirm the photo strip is correctly absent**

Only `2026-08-16` has 2026-27 photos today. Check how many:

```bash
python3 -c "import json; m=json.load(open('src/data/photo-manifest.json')); print(len(m['photosByMeeting'].get('2026-08-16', [])))"
```

If the count is below 3, the strip must not appear in the rendered homepage. If it is 3 or more, it must appear with the most recent photos. Verify the rendered page matches whichever case applies — this is the live exercise of the threshold logic, not a hypothetical.

- [ ] **Step 5: Verify the homepage**

At 375px width, confirm the next meeting's day, time and RSVP button are all visible without scrolling, and that the meeting card sits above the team name. At 1280px, confirm the split layout and that foliage drifts on scroll. Confirm no horizontal scrollbar at 320px. Check all three themes.

- [ ] **Step 6: Run everything and commit**

```bash
npm test && npm run build && npm run check 2>&1 | grep -oE '^- [0-9]+ errors' | head -1
git add src/components/home src/pages/index.astro
git commit -m "feat: rebuild the homepage around the split hero and season timeline"
```

Expected: 71 tests passing; build exits 0; check at 84 errors or fewer.

---

## Task 9: Header restyle

**Files:**
- Modify: `src/components/Header.astro` (styles only)

**Interfaces:**
- Consumes: tokens from Task 1
- Produces: nothing new. Behaviour is unchanged.

963 lines carrying nav, mobile menu, search overlay and their JavaScript. **Change only CSS.** Do not touch the `<script>` block, the markup structure, class names, ids, or ARIA attributes — those are load-bearing for the mobile menu and search overlay.

- [ ] **Step 1: Apply the Restyle Substitution Table across the `<style>` block**

Work through the table in "The Restyle Substitution Table" section near the top of this
plan, applied to every rule in `Header.astro`'s `<style>` block.

`.nav-link`, `.dropdown-link` and `.mobile-nav-link` lose their uppercase and tracking
outright. `.mobile-nav-header` keeps uppercase under override rule 1 — it is a section
label, not a link.

- [ ] **Step 2: Make the header sticky**

Add to the `.site-header` rule:

```css
    position: sticky;
    top: 0;
    z-index: 50;
    backdrop-filter: blur(8px);
    background-color: color-mix(in srgb, var(--color-surface) 88%, transparent);
    border-bottom: 1.5px solid var(--color-border);
```

Remove any existing `border-bottom` on `.site-header` first so there is exactly one.

A previous sticky-header attempt is parked in `git stash@{0}` ("Broken sticky header attempt"). Do not apply the stash — it predates the token system. If the mobile menu overlaps or clips once the header is sticky, the fix is a `z-index` above 50 on `.mobile-menu` and `.search-overlay`, not reverting the sticky positioning.

- [ ] **Step 3: Verify behaviour is intact**

At 375px: hamburger opens and closes the mobile menu; every submenu link works; the search overlay opens, accepts typing, returns results, and closes. At 1280px: dropdowns open on hover and on keyboard focus. Confirm the header stays pinned while scrolling and that nothing overlaps it.

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/components/Header.astro
git commit -m "style: restyle the header to the token system and pin it"
```

---

## Task 10: Footer and sidebar restyle

**Files:**
- Modify: `src/components/Footer.astro`, `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: tokens from Task 1
- Produces: nothing new

`Sidebar.astro` references the legacy `--color-light-gray` / `--color-medium-gray` aliases directly. Migrate those to semantic tokens here; the aliases stay defined in `tokens.css` for the pages still using them.

- [ ] **Step 1: Restyle both files**

Work through "The Restyle Substitution Table" section near the top of this plan against
both files' `<style>` blocks.

`Sidebar.astro` is the heaviest user of the legacy colour aliases, so the last three rows
of the table do most of the work there. Any sidebar section heading that currently relies
on uppercase becomes a label under override rule 1 rather than keeping uppercase on the
heading element itself.

- [ ] **Step 2: Verify**

Check a page that renders the sidebar (any post under `/blog/` or `/meetings/`) at both widths and in all three themes. Confirm the footer's links and any social icons still have visible focus rings.

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/components/Footer.astro src/components/Sidebar.astro
git commit -m "style: restyle the footer and sidebar to the token system"
```

---

## Task 11: Interior pages

**Files:**
- Modify: `src/pages/about.astro`, `src/pages/meeting-plans.astro`, `src/pages/photos.astro`

**Interfaces:**
- Consumes: tokens (Task 1), `Canopy` (Task 4), the `data-reveal` contract (Task 3)
- Produces: nothing new

`newsletters.astro` and `calendar.astro` are 6 lines each and need no edits themselves — but the components they delegate to are **not** restyled by any earlier task. Those are Task 11b. Do not touch `NewsletterList.astro` or `CalendarView.astro` here.

- [ ] **Step 1: `about.astro`**

Apply "The Restyle Substitution Table" from near the top of this plan. Add `data-reveal` to each roster card and each major section heading, with `data-reveal-delay` cycling 1–4 across the roster grid. Add `<Canopy variant="top" rate={0.24} />` to the page's intro section, which needs `position: relative; overflow: hidden` for it.

Roster columns must derive from `season.roster.length` — never hardcode 6.

- [ ] **Step 2: `meeting-plans.astro`**

854 lines and the densest listing page. Apply "The Restyle Substitution Table". Add `data-reveal` to each meeting card. Do not change the filtering, grouping, or date logic — this page's correctness is covered by the existing `season-filter` and `meeting-time` test suites, and those must still pass.

- [ ] **Step 3: `photos.astro`**

Apply "The Restyle Substitution Table". Give gallery thumbnails `border-radius: var(--radius-m)` and confirm every `<img>` has `loading="lazy"` and explicit `width`/`height` so the grid does not shift as R2 images arrive.

- [ ] **Step 4: Verify each page**

Load `/about`, `/meeting-plans`, and `/photos` at 375px and 1280px in all three themes. Confirm no horizontal overflow at 320px on any of them. `/newsletters` and `/calendar` will still look unrestyled at this point — that is expected, and Task 11b fixes them.

- [ ] **Step 5: Run everything and commit**

```bash
npm test && npm run build
git add src/pages
git commit -m "style: restyle the about, meeting plans, and photos pages"
```

Expected: 71 tests passing; build exits 0.

---

## Task 11b: Newsletter list and calendar view

**Files:**
- Modify: `src/components/NewsletterList.astro`, `src/components/CalendarView.astro`

**Interfaces:**
- Consumes: tokens (Task 1), the `data-reveal` contract (Task 3)
- Produces: nothing new

The spec names `/newsletters` and `/calendar` as in-scope pages. Both are 6-line wrappers whose entire appearance comes from these two components, so restyling the pages means restyling these. `CalendarView.astro` is 1050 lines — larger than `Header.astro` — which is why this is its own task rather than part of Task 11.

Both keep their existing markup, class names, ids, and JavaScript. **CSS only**, exactly as in Task 9.

- [ ] **Step 1: `NewsletterList.astro`**

Apply "The Restyle Substitution Table" from near the top of this plan to its `<style>` block. Add `data-reveal` with `data-reveal-delay` cycling 1–4 to each newsletter list item.

- [ ] **Step 2: `CalendarView.astro`**

Apply "The Restyle Substitution Table" to its `<style>` block.

Three calendar-specific rules on top of the table:

- Day cells that currently signal state with a hardcoded colour move to tokens: the "today" highlight becomes `var(--color-action)` with `color: var(--color-action-contrast)`, and days holding a meeting use `var(--color-accent)`.
- Do **not** add `data-reveal` to day cells. A calendar grid staggering in on scroll is exactly the kind of motion that fights someone scanning for a date.
- Do not alter the month-navigation JavaScript, the grid-building logic, or any date computation. The `calendar` and `meeting-time` suites cover this behaviour and must still pass.

- [ ] **Step 3: Verify**

Load `/newsletters` and `/calendar` at 375px and 1280px in all three themes. On the calendar specifically: month navigation still works, today is visibly marked, meeting days are distinguishable from empty days, and the grid does not overflow horizontally at 320px.

- [ ] **Step 4: Run everything and commit**

```bash
npm test && npm run build
git add src/components/NewsletterList.astro src/components/CalendarView.astro
git commit -m "style: restyle the newsletter list and calendar view"
```

Expected: 71 tests passing; build exits 0.

---

## Task 12: Cleanup and full verification

**Files:**
- Modify: `package.json`, `src/components/Layout.astro`, `src/components/NextMeetingBanner.astro`

**Interfaces:**
- Consumes: everything
- Produces: the finished branch

- [ ] **Step 1: Confirm no Oswald or Roboto Condensed references remain**

```bash
grep -rn "Oswald\|Roboto Condensed\|roboto-condensed\|oswald" src public package.json || echo "CLEAN"
```

Expected: `CLEAN`. If anything is found, migrate it to `var(--font-heading-primary)` before continuing.

- [ ] **Step 2: Remove the retired font packages**

```bash
npm uninstall @fontsource/oswald @fontsource/roboto-condensed
npm run build
```

Expected: build exits 0. If it fails, an import was missed — restore, fix the reference, and retry.

- [ ] **Step 3: Confirm no llama references survive outside archived content**

```bash
grep -rn "llama\|Llama" src/components src/styles src/pages public || echo "CLEAN"
```

Expected: `CLEAN`. Matches inside `src/content/` are archived 2025-26 meeting notes and newsletters referring to the Looting Llamas by name — those are historical record and must not be touched.

- [ ] **Step 4: Retire the old next-meeting banner if it is now unused**

```bash
grep -rn "NextMeetingBanner" src || echo "UNUSED"
```

If `UNUSED`, delete `src/components/NextMeetingBanner.astro` — `NextMeetingCard` replaced it. If any page still imports it, restyle it with the substitution table instead of deleting.

- [ ] **Step 5: Confirm the uppercase heading rule is genuinely gone**

```bash
grep -rn "text-transform: uppercase" src/styles/
```

Expected: matches only inside the `.eyebrow, .label` rule in `base.css`. Any match on an `h1`–`h6` selector is a failure.

- [ ] **Step 6: Full verification sweep**

```bash
npm test && npm run build && npm run check 2>&1 | grep -oE '^- [0-9]+ errors' | head -1
```

Expected: 71 tests passing; build exits 0; 84 errors or fewer.

- [ ] **Step 7: Manual matrix**

For each of `/`, `/about`, `/meeting-plans`, `/newsletters`, `/calendar`, `/photos`, and `/2025/`:

- 375px and 1280px
- light, dark, and glow themes
- no horizontal scrollbar at 320px

Then specifically:

- `/2025/` renders red-on-white in light and brighter-red-on-near-black in dark, with no foliage.
- With OS reduced-motion on, the homepage shows all content immediately, nothing parallaxes, and no spores fall in glow mode.
- With JavaScript disabled, the homepage renders all content — nothing stuck at `opacity: 0`.
- A smoke check of the untouched pages `/rsvps`, `/snacks`, `/calculator`, `/resources`: they inherit Fraunces and the new tokens without broken layout.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: remove retired fonts and the llama theme remnants"
```

---

## Notes for the executor

**Do not run `npm run dev` in a shell.** Another session owns port 4321. Use the preview tooling, which assigns its own port.

**Every task's visual gate is real.** Several tasks have no unit tests because their output is CSS, and for those the browser check *is* the test — do not mark them complete on a green build alone.

**If a task uncovers that `Header.astro` needs behavioural changes** rather than styling changes, stop and flag it. The plan assumes its JavaScript is untouched, and that assumption failing changes the risk profile.
