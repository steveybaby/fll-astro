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
  data: { title: string; date: Date; milestone?: string; startTime?: string };
}

/** Sorts last among same-day milestones when no startTime is given. */
const NO_START_TIME = '99:99';

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
      _startTime: m.data.startTime ?? NO_START_TIME,
    }))
    // Two milestones can share a date — the season tournament and the
    // celebration that follows it, for instance. Falling back to collection
    // order there would let the sequence flip between builds, so same-day
    // milestones are ordered by start time. "HH:MM" is zero-padded, so a
    // string compare is a time compare.
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a._startTime.localeCompare(b._startTime))
    .map(({ _startTime, ...milestone }) => milestone);

  return marked.length < MIN_MILESTONES ? [] : marked;
}
