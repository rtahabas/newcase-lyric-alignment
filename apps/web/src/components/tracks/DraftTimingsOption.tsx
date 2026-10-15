import { useMemo } from 'react';
import type { Ms } from '../../lib/time';
import { formatShort } from '../../lib/time';
import { parseLrc } from '../../lib/lrcParse';
import type { LyricsCandidate } from '../../sources/lyricsLookup';

type Props = {
  version: { candidate: LyricsCandidate & { synced: string }; usable: boolean };
  durationMs: Ms | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const label = (c: LyricsCandidate) =>
  `${c.artist}${c.durationMs !== null ? `, ${formatShort(c.durationMs)}` : ''}`;

/**
 * Opt-in: start from LRCLIB's line timings instead of timing from scratch.
 * Off by default. When the only timed versions are a different length, says so
 * instead of offering timings that would land nowhere near the words (D9).
 */
export function DraftTimingsOption({ version, durationMs, checked, onChange }: Props) {
  const { candidate: c, usable } = version;
  const count = useMemo(() => parseLrc(c.synced).filter((e) => e.text).length, [c.synced]);
  const yours = durationMs !== null ? formatShort(durationMs) : 'your audio';

  if (!usable) {
    return (
      <p className="draft-option draft-option--off small" data-testid="draft-unavailable">
        LRCLIB has line timings only for a different-length version ({label(c)} vs your {yours}), so they
        would not line up with your recording. Create the track and use <strong>Start timing</strong>: one
        pass with <kbd>Enter</kbd> and the lyrics flow.
      </p>
    );
  }

  return (
    <label className="draft-option" data-testid="draft-timings">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>Start from LRCLIB’s timings</strong> — {count} lines already placed, so the lyrics flow
        straight away.{' '}
        <span className="small muted">
          They come from {label(c)} (yours is {yours}) and use its line breaks rather than the sheet above.
          Check them by ear; select a run and shift it if they drift. Leave unticked to time it yourself.
        </span>
      </span>
    </label>
  );
}
