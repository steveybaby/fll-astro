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
export async function getSeasonContent(collection: any, season: string = CURRENT_SEASON) {
  const entries = await getCollection(collection);
  return filterBySeason(entries as any[], season);
}
