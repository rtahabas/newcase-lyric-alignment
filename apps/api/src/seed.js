/**
 * Seeds the one track and its lyric sheet. That is all there is to seed: the
 * timings are the thing the candidate produces, so the database starts with
 * none, and it stays that way until something is saved through PUT.
 *
 * Provenance: "You Verse You" is AI generated - words and recording both - and
 * was downloaded from https://aisong.org. Nothing here is adapted from a
 * human-authored song, there is nobody to credit, and candidates are welcome
 * to use it for the exercise. See GRADER_NOTES.md, "Provenance".
 *
 *   node src/seed.js          seed if empty
 *   node src/seed.js --reset  drop everything and reseed
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, closeDb, resetSchema } from './db.js';
import { ROOT } from './config.js';

const TRACK_ID = 1;
const TITLE = 'You Verse You';
const ARTIST = 'AI generated (aisong.org)';
const AUDIO_URL = '/api/audio/you-verse-you.mp3';

// The mp3's own duration, to three decimals. Read off the file once and written
// down here rather than computed, because nothing in this fixture decodes audio:
// a client that wants the waveform decodes it in the browser.
const DURATION_SECONDS = 124.96;

function readLines() {
  const raw = readFileSync(join(ROOT, 'seed', 'lines.txt'), 'utf8');
  return raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
}

export function seed({ reset = false } = {}) {
  const db = getDb();

  // Drops rather than empties, so a database written by an older version of this
  // fixture is rebuilt instead of failing against the current schema.
  if (reset) resetSchema();

  const existing = db.prepare('SELECT COUNT(*) AS n FROM tracks').get();
  if (existing.n > 0 && !reset) return { skipped: true };

  const lines = readLines();

  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO tracks (id, title, artist, duration_seconds, audio_url) VALUES (?, ?, ?, ?, ?)'
    ).run(TRACK_ID, TITLE, ARTIST, DURATION_SECONDS, AUDIO_URL);

    const insLine = db.prepare('INSERT INTO lyric_lines (id, track_id, idx, text) VALUES (?, ?, ?, ?)');
    lines.forEach((text, i) => insLine.run(i + 1, TRACK_ID, i, text));

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { skipped: false, lines: lines.length, duration_seconds: DURATION_SECONDS };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reset = process.argv.includes('--reset');
  const r = seed({ reset });
  if (r.skipped) console.log('seed: already populated (use --reset to rebuild)');
  else console.log(`seed: ${r.lines} lines, ${r.duration_seconds}s${reset ? ' (reset)' : ''}`);
  closeDb();
}
