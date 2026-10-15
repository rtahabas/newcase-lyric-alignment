import { useEffect, useState } from 'react';
import type { Ms } from '../../lib/time';
import { formatShort } from '../../lib/time';
import { parseLyricSheet } from '../../lib/lyrics';
import type { LyricsCandidate } from '../../sources/lyricsLookup';
import { isConfident, VERSION_GAP_MS } from '../../sources/lyricsLookup';
import type { LookupState } from './useLyricsLookup';
import { LookupStatus } from './LookupStatus';

type Props = {
  sheet: string;
  onSheet: (s: string) => void;
  title: string;
  durationMs: Ms | null;
  /** Owned by the dialog, which also needs the timed versions (draft timings). */
  lookup: LookupState;
  onRetry: () => void;
};

/** Says where the filled lyrics came from, and flags a likely different version. */
function SourceNote({ candidate: c, durationMs }: { candidate: LyricsCandidate; durationMs: Ms | null }) {
  const gap =
    c.durationMs !== null && durationMs !== null && Math.abs(c.durationMs - durationMs) > VERSION_GAP_MS;
  return (
    <span className="muted small" data-testid="lyrics-source">
      From LRCLIB: {c.title} — {c.artist}
      {c.durationMs !== null && ` (${formatShort(c.durationMs)})`}.{' '}
      {gap && durationMs !== null && (
        <strong className="save-state--warn">
          Your audio is {formatShort(durationMs)} — probably another version, so some words may differ.{' '}
        </strong>
      )}
      Check it against the recording; edits here are yours.
    </span>
  );
}

/** Where the current sheet came from: the user's own typing always wins over a lookup. */
export type SheetOrigin =
  | { kind: 'empty' }
  | { kind: 'lookup'; candidate: LyricsCandidate }
  | { kind: 'typed' };

/**
 * The lyric sheet for a new track: filled automatically from LRCLIB when the
 * match is confident, offered as choices when it is not, and always editable.
 */
export function LyricsField({ sheet, onSheet, title, durationMs, lookup, onRetry }: Props) {
  const [origin, setOrigin] = useState<SheetOrigin>({ kind: 'empty' });
  const lines = parseLyricSheet(sheet).length;

  const use = (c: LyricsCandidate) => {
    onSheet(c.lyrics);
    setOrigin({ kind: 'lookup', candidate: c });
  };

  // Auto-fill only a confident match, and never over something the user typed.
  useEffect(() => {
    if (lookup.status !== 'done' || origin.kind === 'typed') return;
    const best = lookup.candidates[0];
    if (
      isConfident(best, title, durationMs) &&
      !(origin.kind === 'lookup' && origin.candidate.id === best.id)
    ) {
      onSheet(best.lyrics);
      setOrigin({ kind: 'lookup', candidate: best });
    }
  }, [lookup, title, durationMs, origin, onSheet]);

  return (
    <div className="field">
      <label htmlFor="new-lyrics">
        Lyrics · {lines} line{lines === 1 ? '' : 's'}
      </label>
      <LookupStatus
        lookup={lookup}
        origin={origin}
        title={title}
        durationMs={durationMs}
        onUse={use}
        onRetry={onRetry}
      />
      <textarea
        id="new-lyrics"
        rows={8}
        value={sheet}
        onChange={(e) => {
          onSheet(e.target.value);
          setOrigin(e.target.value.trim() ? { kind: 'typed' } : { kind: 'empty' });
        }}
        placeholder="Found lyrics appear here — or paste the sheet yourself, one line per row."
        data-testid="new-lyrics"
      />
      {origin.kind === 'lookup' && <SourceNote candidate={origin.candidate} durationMs={durationMs} />}
    </div>
  );
}
