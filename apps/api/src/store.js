import { getDb } from './db.js';

const segment = (row) => ({ line_id: String(row.line_id), start_ms: row.start_ms, end_ms: row.end_ms });

export const TRACK_ID = 1;

export function getTrack(trackId = TRACK_ID) {
  return getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(trackId);
}

function latestAlignment(trackId) {
  return getDb()
    .prepare('SELECT id, version FROM alignments WHERE track_id = ? ORDER BY version DESC LIMIT 1')
    .get(trackId);
}

/**
 * The track's current state. Before anything is saved, version is 0, the lines
 * are the seeded sheet, and there is no alignment. After a save, both the lines
 * and the segments come from that saved version - PUT carries lines, so each
 * version owns its own lyric sheet.
 */
export function currentState(trackId = TRACK_ID) {
  const db = getDb();
  const latest = latestAlignment(trackId);

  if (!latest) {
    const lines = db
      .prepare('SELECT id, idx, text FROM lyric_lines WHERE track_id = ? ORDER BY idx')
      .all(trackId)
      .map((r) => ({ id: String(r.id), index: r.idx, text: r.text }));
    return { version: 0, lines, alignment: null };
  }

  const lines = db
    .prepare('SELECT line_id, idx, text FROM alignment_lines WHERE alignment_id = ? ORDER BY idx')
    .all(latest.id)
    .map((r) => ({ id: String(r.line_id), index: r.idx, text: r.text }));

  const segments = db
    .prepare('SELECT line_id, start_ms, end_ms FROM alignment_segments WHERE alignment_id = ? ORDER BY ord')
    .all(latest.id)
    .map(segment);

  return { version: latest.version, lines, alignment: { segments } };
}

/** Appends a new version. Caller has already validated and checked the version. */
export function saveAlignment(trackId, lines, segments) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const prev = latestAlignment(trackId);
    const version = (prev?.version ?? 0) + 1;

    const { lastInsertRowid } = db
      .prepare('INSERT INTO alignments (track_id, version, created_at) VALUES (?, ?, ?)')
      .run(trackId, version, new Date().toISOString());
    const alignmentId = Number(lastInsertRowid);

    const insLine = db.prepare('INSERT INTO alignment_lines (alignment_id, line_id, idx, text) VALUES (?, ?, ?, ?)');
    for (const l of lines) insLine.run(alignmentId, l.id, l.index, l.text);

    const insSeg = db.prepare('INSERT INTO alignment_segments (alignment_id, line_id, start_ms, end_ms, ord) VALUES (?, ?, ?, ?, ?)');
    segments.forEach((s, ord) => insSeg.run(alignmentId, s.line_id, s.start_ms, s.end_ms, ord));

    db.exec('COMMIT');
    return version;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
