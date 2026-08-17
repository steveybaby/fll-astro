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

  it('roster is six members in fixed order', () => {
    expect(getCurrentSeason().roster.map((m) => m.name)).toEqual([
      'Jasper',
      'Ethan',
      'Luca',
      'Ishaan',
      'Hudson',
      'Eli',
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
      Eli: false,
    });
  });

  it('meeting defaults are Sunday 2pm for two hours in Moraga', () => {
    expect(getCurrentSeason().defaults).toEqual({
      startTime: '14:00',      duration: 2.5,
      location: '188 Calle La Montana, Moraga, CA, 94556',
    });
  });

  it('current season has three coaches with unique initials', () => {
    const { coaches } = getCurrentSeason();
    expect(coaches).toHaveLength(3);
    expect(new Set(coaches.map((c) => c.initials)).size).toBe(coaches.length);
  });

  it('current season coaches include Aditi, not Esther', () => {
    const names = getCurrentSeason().coaches.map((c) => c.name);
    expect(names).toEqual(['Steve H', 'Steve S', 'Aditi']);
  });

  it('the archive keeps the coaches it actually had', () => {
    // Esther coached 2025-26 and appears in that season's frozen attendance
    // history, so the archive must not be retroactively re-staffed.
    const names = getSeason('2025-26').coaches.map((c) => c.name);
    expect(names).toEqual(['Steve H', 'Steve S', 'Esther R']);
  });

  it('every season has coaches with unique initials', () => {
    for (const season of Object.values(SEASONS)) {
      const initials = season.coaches.map((c) => c.initials);
      expect(new Set(initials).size).toBe(initials.length);
    }
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
