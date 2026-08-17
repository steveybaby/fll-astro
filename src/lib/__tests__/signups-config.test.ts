import { describe, it, expect } from 'vitest';
import { buildSignupsConfig } from '../signups-config';

const SEASON = {
  id: '2026-27',
  roster: [
    { name: 'Jasper', initials: 'JH', returning: true },
    { name: 'Eli', initials: 'EB', returning: false },
  ],
  coaches: [{ name: 'Steve H', initials: 'SH' }],
};

function meeting(date: string) {
  return { data: { date: new Date(`${date}T00:00:00Z`) } };
}

describe('buildSignupsConfig', () => {
  it('lists roster then coaches, all of them', () => {
    const cfg = buildSignupsConfig(SEASON as any, [meeting('2026-08-16')] as any);
    expect(cfg.people).toEqual(['Jasper', 'Eli', 'Steve H']);
  });

  it('throws on a duplicate name within the roster', () => {
    const season = {
      ...SEASON,
      roster: [
        { name: 'Ethan', initials: 'EM', returning: true },
        { name: 'Ethan', initials: 'EK', returning: false },
      ],
    };
    expect(() => buildSignupsConfig(season as any, [] as any)).toThrow(/Duplicate signup name/);
  });

  it('throws when a coach shares a name with a kid', () => {
    const season = {
      ...SEASON,
      coaches: [{ name: 'Jasper', initials: 'JX' }],
    };
    expect(() => buildSignupsConfig(season as any, [] as any)).toThrow(/Jasper/);
  });

  it('emits the season id', () => {
    const cfg = buildSignupsConfig(SEASON as any, [] as any);
    expect(cfg.season).toBe('2026-27');
  });

  it('emits meeting dates as YYYY-MM-DD, sorted, deduped', () => {
    const cfg = buildSignupsConfig(
      SEASON as any,
      [meeting('2026-12-05'), meeting('2026-08-16'), meeting('2026-12-05')] as any
    );
    expect(cfg.meetingDates).toEqual(['2026-08-16', '2026-12-05']);
  });

  it('never emits a timestamp form', () => {
    const cfg = buildSignupsConfig(SEASON as any, [meeting('2026-08-16')] as any);
    for (const d of cfg.meetingDates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
