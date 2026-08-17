import { describe, it, expect } from 'vitest';
import { deriveMilestones } from '../timeline';

const NOW = new Date('2026-10-01T12:00:00-07:00');

function meeting(slug: string, date: string, title: string, milestone?: string, startTime?: string) {
  return { slug, data: { title, date: new Date(`${date}T12:00:00-07:00`), milestone, startTime } };
}

describe('deriveMilestones', () => {
  it('orders same-day milestones by start time, not collection order', () => {
    // The tournament and the celebration that follows it share a date. Passed
    // in reverse order on purpose: date alone ties, so only the start time can
    // put them right.
    const result = deriveMilestones(
      [
        meeting('celebration', '2026-12-05', 'Season Celebration', 'Celebration', '14:00'),
        meeting('tournament', '2026-12-05', 'Community Tournament', 'Tournament', '08:00'),
      ],
      NOW
    );

    expect(result.map((m) => m.label)).toEqual(['Tournament', 'Celebration']);
  });

  it('sorts a milestone with no start time after same-day ones that have it', () => {
    const result = deriveMilestones(
      [
        meeting('untimed', '2026-12-05', 'Untimed', 'Untimed'),
        meeting('tournament', '2026-12-05', 'Community Tournament', 'Tournament', '08:00'),
      ],
      NOW
    );

    expect(result.map((m) => m.label)).toEqual(['Tournament', 'Untimed']);
  });

  it('does not leak the internal sort key onto returned milestones', () => {
    const result = deriveMilestones(
      [
        meeting('a', '2026-08-16', 'A', 'Kickoff', '14:00'),
        meeting('b', '2026-12-05', 'B', 'Tournament', '08:00'),
      ],
      NOW
    );

    expect(Object.keys(result[0]).sort()).toEqual(['date', 'done', 'label', 'slug', 'title']);
  });

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

  it('does not mark a milestone done early in the Pacific evening before its day', () => {
    // 5:30pm Pacific on Dec 4 — the evening before a Dec 5 milestone. The old
    // `date.getTime() <= now.getTime()` comparison against a UTC-midnight
    // frontmatter date would already call this done, up to 8 hours early.
    const eveningBefore = new Date('2026-12-04T17:30:00-08:00');
    const result = deriveMilestones(
      [
        meeting('other', '2026-08-16', 'Other', 'Kickoff'),
        meeting('tournament', '2026-12-05', 'Tournament', 'Tournament'),
      ],
      eveningBefore
    );

    expect(result.find((m) => m.slug === 'tournament')?.done).toBe(false);
  });

  it('handles the Pacific fall-back Sunday, which is a 25-hour day', () => {
    // 2026-11-01 is the DST fall-back. Deriving "done" by shifting `now` forward
    // a fixed 24h lands inside the SAME Pacific day here, so a milestone dated
    // that day read as upcoming for the first hour after local midnight.
    const justAfterMidnight = new Date('2026-11-01T00:30:00-07:00');
    const result = deriveMilestones(
      [
        meeting('kickoff', '2026-08-16', 'Kickoff', 'Kickoff'),
        meeting('fallback', '2026-11-01', 'Fall-back day', 'Fallback'),
      ],
      justAfterMidnight
    );

    expect(result.find((m) => m.slug === 'fallback')?.done).toBe(true);
  });

  it('marks a milestone done on its own Pacific calendar day', () => {
    const sameDay = new Date('2026-12-05T10:00:00-08:00');
    const result = deriveMilestones(
      [
        meeting('other', '2026-08-16', 'Other', 'Kickoff'),
        meeting('tournament', '2026-12-05', 'Tournament', 'Tournament'),
      ],
      sameDay
    );

    expect(result.find((m) => m.slug === 'tournament')?.done).toBe(true);
  });
});
