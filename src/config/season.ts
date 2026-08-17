export interface RosterMember {
  name: string;
  initials: string;
  returning: boolean;
}

export interface CoachMember {
  name: string;
  initials: string;
}

export interface SeasonDefaults {
  startTime: string;
  duration: number;
  location: string;
}

export interface Season {
  id: string;
  challenge: string;
  teamName: string;
  archived: boolean;
  archivePath: string | null;
  roster: RosterMember[];
  coaches: CoachMember[];
  defaults: SeasonDefaults;
}

// Coach names must match the Google Sheet column headers exactly — writes key
// on them, and a mismatch fails with "not found in headers".
const COACHES_2026: CoachMember[] = [
  { name: 'Steve H', initials: 'SH' },
  { name: 'Steve S', initials: 'SS' },
  { name: 'Aditi', initials: 'AA' },
];

// Esther coached the 2025-26 season and appears throughout its frozen
// attendance history, so the archive keeps her.
const COACHES_2025: CoachMember[] = [
  { name: 'Steve H', initials: 'SH' },
  { name: 'Steve S', initials: 'SS' },
  { name: 'Esther R', initials: 'ER' },
];

export const CURRENT_SEASON = '2026-27';

const MORAGA = '188 Calle La Montana, Moraga, CA, 94556';

export const SEASONS: Record<string, Season> = {
  '2026-27': {
    id: '2026-27',
    challenge: 'BIOGLOW',
    // Placeholder name. This is the only place the team name is defined.
    teamName: 'Bio-Llamas',
    archived: false,
    archivePath: null,
    roster: [
      { name: 'Jasper', initials: 'JH', returning: true },
      { name: 'Ethan', initials: 'EM', returning: true },
      { name: 'Luca', initials: 'LS', returning: true },
      { name: 'Ishaan', initials: 'IA', returning: false },
      { name: 'Hudson', initials: 'HH', returning: false },
      { name: 'Eli', initials: 'EB', returning: false },
    ],
    coaches: COACHES_2026,
    defaults: { startTime: '14:00', duration: 2, location: MORAGA },
  },
  '2025-26': {
    id: '2025-26',
    challenge: 'UNEARTHED',
    teamName: 'Looting Llamas',
    archived: true,
    archivePath: '/2025',
    roster: [
      { name: 'Jasper', initials: 'JH', returning: false },
      { name: 'Asher', initials: 'AO', returning: false },
      { name: 'Kai', initials: 'KP', returning: false },
      { name: 'Jeremiah', initials: 'JR', returning: false },
      { name: 'Luca', initials: 'LS', returning: false },
      { name: 'Ethan', initials: 'EM', returning: false },
    ],
    coaches: COACHES_2025,
    defaults: { startTime: '15:30', duration: 2.5, location: MORAGA },
  },
};

/** Archived seasons, most recently ended first. Drives the archive links in
 * Header.astro/Footer.astro so a future season reset doesn't require hunting
 * down hardcoded `/2025`-style paths. */
export const ARCHIVED_SEASONS: Season[] = Object.values(SEASONS)
  .filter((s) => s.archived)
  .sort((a, b) => b.id.localeCompare(a.id));

export function getSeason(id: string): Season {
  const season = SEASONS[id];
  if (!season) throw new Error(`Unknown season: ${id}`);
  return season;
}

export function getCurrentSeason(): Season {
  return getSeason(CURRENT_SEASON);
}
