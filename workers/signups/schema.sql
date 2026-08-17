-- One row per (meeting, person, kind). Upsert on the primary key.
CREATE TABLE IF NOT EXISTS signups (
  meeting_date TEXT NOT NULL,
  person       TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('rsvp', 'snack')),
  value        TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (meeting_date, person, kind)
);

-- Reads are always "everything for one meeting".
CREATE INDEX IF NOT EXISTS idx_signups_meeting ON signups (meeting_date);
