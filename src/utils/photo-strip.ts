/**
 * Homepage photo strip selection. Pure, so it is testable without the R2
 * manifest or Astro's content runtime.
 */

export interface StripPhoto {
  thumbnail: string;
  fullImage: string;
  meetingDate: string;
}

interface ManifestPhoto {
  thumbnail: string;
  fullImage: string;
}

interface Manifest {
  photosByMeeting?: Record<string, ManifestPhoto[]>;
}

/**
 * Below this many photos the strip renders nothing at all. A homepage section
 * showing one lonely image reads as broken; an absent section reads as
 * intentional, and the strip fills in on its own as the season goes.
 */
const MIN_PHOTOS = 3;

/**
 * Most recent photos belonging to the given season's meetings.
 *
 * @param manifest        parsed src/data/photo-manifest.json
 * @param seasonMeetingDates  YYYY-MM-DD keys for the current season's meetings
 * @param limit           maximum photos returned
 */
export function selectStripPhotos(
  manifest: Manifest,
  seasonMeetingDates: string[],
  limit = 6
): StripPhoto[] {
  const byMeeting = manifest.photosByMeeting ?? {};
  const allowed = new Set(seasonMeetingDates);

  // ISO date keys sort lexically, so a plain reverse sort is newest-first.
  const keys = Object.keys(byMeeting)
    .filter((date) => allowed.has(date))
    .sort()
    .reverse();

  const selected: StripPhoto[] = [];
  for (const meetingDate of keys) {
    for (const photo of byMeeting[meetingDate] ?? []) {
      if (selected.length >= limit) break;
      selected.push({ thumbnail: photo.thumbnail, fullImage: photo.fullImage, meetingDate });
    }
    if (selected.length >= limit) break;
  }

  return selected.length < MIN_PHOTOS ? [] : selected;
}
