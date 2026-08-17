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
