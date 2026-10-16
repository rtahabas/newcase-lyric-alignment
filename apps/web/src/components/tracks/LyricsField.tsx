import { useEffect, useRef, useState } from 'react';
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
  artist: string;
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
  /** `auto`: filled by the lookup; false once the user picked this match themselves. */
  | { kind: 'lookup'; candidate: LyricsCandidate; auto: boolean }
  | { kind: 'typed' };

/**
 * The lyric sheet for a new track: filled automatically from LRCLIB when the
 * match is confident, offered as choices when it is not, and always editable.
 */
export function LyricsField({ sheet, onSheet, title, artist, durationMs, lookup, onRetry }: Props) {
  const [origin, setOrigin] = useState<SheetOrigin>({ kind: 'empty' });
  /** The lookup result already acted on: each result may auto-fill at most once. */
  const handled = useRef<LookupState | null>(null);
  const lines = parseLyricSheet(sheet).length;

  const use = (c: LyricsCandidate) => {
    onSheet(c.lyrics);
    setOrigin({ kind: 'lookup', candidate: c, auto: false });
  };

  // Auto-fill a confident match once per lookup result - never over the user's
  // typing or their own pick, and never again after they clear the field.
  useEffect(() => {
    if (lookup.status !== 'done' || handled.current === lookup) return;
    handled.current = lookup;
    if (origin.kind === 'typed' || (origin.kind === 'lookup' && !origin.auto)) return;
    const best = lookup.candidates[0];
    if (best && isConfident(best, title, artist, durationMs)) {
      onSheet(best.lyrics);
      setOrigin({ kind: 'lookup', candidate: best, auto: true });
    }
  }, [lookup, title, artist, durationMs, origin, onSheet]);

  return (
    <div className="field">
      <label htmlFor="new-lyrics">
        Lyrics · {lines} line{lines === 1 ? '' : 's'}
      </label>
      <LookupStatus
        lookup={lookup}
        origin={origin}
        title={title}
        artist={artist}
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
