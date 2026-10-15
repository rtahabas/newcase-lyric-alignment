import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DB_PATH } from './config.js';

/**
 * Schema notes worth knowing before changing anything:
 *
 * - Each saved version snapshots its own lyric sheet in `alignment_lines`,
 *   because a write carries lines as well as segments. `lyric_lines` holds the
 *   originally seeded sheet, is never mutated, and is what reads fall back to
 *   before anything has been saved.
 *
 * - Line ids are TEXT and client-owned: the client decides ids for the lines it
 *   creates, and segments reference those ids within the same request. Seeded
 *   ids are numeric strings.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS tracks (
  id               INTEGER PRIMARY KEY,
  title            TEXT NOT NULL,
  artist           TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  audio_url        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lyric_lines (
  id       INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  idx      INTEGER NOT NULL,
  text     TEXT NOT NULL,
  UNIQUE (track_id, idx)
);

CREATE TABLE IF NOT EXISTS alignments (
  id         INTEGER PRIMARY KEY,
  track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  version    INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (track_id, version)
);

CREATE TABLE IF NOT EXISTS alignment_lines (
  alignment_id INTEGER NOT NULL REFERENCES alignments(id) ON DELETE CASCADE,
  line_id      TEXT NOT NULL,
  idx          INTEGER NOT NULL,
  text         TEXT NOT NULL,
  UNIQUE (alignment_id, line_id)
);

CREATE TABLE IF NOT EXISTS alignment_segments (
  alignment_id INTEGER NOT NULL REFERENCES alignments(id) ON DELETE CASCADE,
  line_id      TEXT NOT NULL,
  start_ms     INTEGER NOT NULL,
  end_ms       INTEGER NOT NULL,
  ord          INTEGER NOT NULL,
  UNIQUE (alignment_id, line_id)
);

CREATE INDEX IF NOT EXISTS idx_lines_track  ON lyric_lines (track_id, idx);
CREATE INDEX IF NOT EXISTS idx_align_track  ON alignments (track_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_aseg_align   ON alignment_segments (alignment_id, ord);
CREATE INDEX IF NOT EXISTS idx_alines_align ON alignment_lines (alignment_id, idx);
`;

/**
 * Tables this fixture has ever created, newest first, children before parents.
 * `--reset` drops them all and re-runs the DDL rather than emptying them, so a
 * database left over from an older version of this fixture - one whose `tracks`
 * still has a `peaks_json` column, or which still has an `autoalign_segments`
 * table - is rebuilt rather than failing on the next insert.
 */
const ALL_TABLES = [
  'alignment_segments',
  'alignment_lines',
  'alignments',
  'autoalign_segments',
  'lyric_lines',
  'tracks',
];

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  // `pnpm reset` opens a second connection while the server holds this one;
  // WAL allows one writer, so wait for it rather than throwing SQLITE_BUSY.
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(DDL);
  return db;
}

/** Drops every table and rebuilds the schema. Used by `--reset`. */
export function resetSchema() {
  const d = getDb();
  for (const t of ALL_TABLES) d.exec(`DROP TABLE IF EXISTS ${t}`);
  d.exec(DDL);
}

export function closeDb() {
  if (db) { db.close(); db = undefined; }
}
