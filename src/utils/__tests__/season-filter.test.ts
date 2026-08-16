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
