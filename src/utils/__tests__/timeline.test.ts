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
