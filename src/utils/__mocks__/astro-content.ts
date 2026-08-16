// Test-only stand-in for Astro's virtual "astro:content" module.
//
// vitest runs plain Node/Vite without Astro's content-collection vite plugin,
// so the real "astro:content" virtual module cannot be resolved. season.ts
// imports getCollection from it at module scope, which means any test that
// imports season.ts (even indirectly, even if it only exercises
// filterBySeason) needs "astro:content" to resolve to *something*, or the
// module graph fails to load.
//
// getSeasonContent (the only export that actually calls getCollection) is
// intentionally not covered by unit tests — see season.ts's doc comment.
// This stub exists solely so the module can load; it should never run.
export async function getCollection(): Promise<never[]> {
  throw new Error(
    'astro:content is not available in tests. getSeasonContent is not covered by unit tests; see src/utils/season.ts.'
  );
}
