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

/**
 * Roster first, then coaches — the order the signup tables render in.
 *
 * Throws on a duplicate name rather than deduping. The D1 primary key is
 * (meeting_date, person, kind) and `person` is the display name, so two people
 * called "Ethan" would share one row and each would silently overwrite the
 * other's RSVP. First names repeat often enough that the roster carries
 * `initials`; failing the build is the only way anyone finds out in time.
 */
export function buildSignupsConfig(
  season: SeasonLike,
  meetings: MeetingLike[]
): SignupsConfig {
  const people = [...season.roster.map((m) => m.name), ...season.coaches.map((c) => c.name)];

  const seen = new Set<string>();
  for (const name of people) {
    if (seen.has(name)) {
      throw new Error(
        `Duplicate signup name "${name}" in season ${season.id}. Signups key on the display name, so two people sharing one would share a single RSVP row. Disambiguate them in src/config/season.ts.`
      );
    }
    seen.add(name);
  }

  const meetingDates = [
    ...new Set(meetings.map((m) => m.data.date.toISOString().slice(0, 10))),
  ].sort();

  return { season: season.id, people, meetingDates };
}
