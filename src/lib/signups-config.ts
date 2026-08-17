/**
 * Shape of the config the Worker fetches to validate writes.
 *
 * Kept as a pure function so it is testable without Astro's content runtime,
 * matching the filterBySeason / getSeasonContent split in src/utils/season.ts.
 */

export interface SignupsConfig {
  season: string;
  people: string[];
  meetingDates: string[];
}

interface SeasonLike {
  id: string;
  roster: { name: string }[];
  coaches: { name: string }[];
}

interface MeetingLike {
  data: { date: Date };
}

/** Roster first, then coaches — the order the signup tables render in. */
export function buildSignupsConfig(
  season: SeasonLike,
  meetings: MeetingLike[]
): SignupsConfig {
  const people = [...season.roster.map((m) => m.name), ...season.coaches.map((c) => c.name)];

  const meetingDates = [
    ...new Set(meetings.map((m) => m.data.date.toISOString().slice(0, 10))),
  ].sort();

  return { season: season.id, people, meetingDates };
}
