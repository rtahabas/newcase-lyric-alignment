import type { Ms } from '../../lib/time';
import { formatShort } from '../../lib/time';
import type { LyricsCandidate } from '../../sources/lyricsLookup';
import { isConfident } from '../../sources/lyricsLookup';
import type { LookupState } from './useLyricsLookup';
import type { SheetOrigin } from './LyricsField';

type Props = {
  lookup: LookupState;
  origin: SheetOrigin;
  title: string;
  durationMs: Ms | null;
  onUse: (c: LyricsCandidate) => void;
  onRetry: () => void;
};

const describe = (c: LyricsCandidate) =>
  [`${c.title} — ${c.artist}`, c.album, c.durationMs !== null ? formatShort(c.durationMs) : '']
    .filter(Boolean)
    .join(' · ');

/** What the lookup found, in words, plus the other matches to pick from. */
export function LookupStatus({ lookup, origin, title, durationMs, onUse, onRetry }: Props) {
  if (lookup.status === 'idle') return null;
  if (lookup.status === 'searching') {
    return (
      <span className="muted small" role="status">
        Looking up lyrics on LRCLIB…
      </span>
    );
  }
  if (lookup.status === 'error') {
    return (
      <span className="muted small" role="status" data-testid="lyrics-error">
        Could not reach LRCLIB ({lookup.message}).{' '}
        <button type="button" className="btn-ghost small" onClick={onRetry}>
          Try again
        </button>{' '}
        or paste the lyrics below.
      </span>
    );
  }
  const { candidates } = lookup;
  if (candidates.length === 0) {
    return (
      <span className="muted small" role="status" data-testid="lyrics-none">
        No lyrics found for “{title.trim()}”. Paste them below.
      </span>
    );
  }
  const current = origin.kind === 'lookup' ? origin.candidate.id : null;
  const others = candidates.filter((c) => c.id !== current);
  if (others.length === 0) return null;
  const confident = isConfident(candidates[0], title, durationMs);
  const list = (
    <ul className="lookup__list">
      {others.slice(0, 4).map((c) => (
        <li key={c.id}>
          <button type="button" className="btn-ghost small" onClick={() => onUse(c)}>
            Use
          </button>
          <span className="small ellipsis">{describe(c)}</span>
        </li>
      ))}
    </ul>
  );
  // Already filled: keep alternatives one click away instead of in the way.
  if (current !== null) {
    return (
      <details className="lookup" data-testid="lyrics-candidates">
        <summary className="muted small">Wrong song? Show {others.length} other match(es)</summary>
        {list}
      </details>
    );
  }
  return (
    <div className="lookup" role="status" data-testid="lyrics-candidates">
      <span className="muted small">
        {confident
          ? 'Matches found:'
          : 'Possible matches (none has your title or your audio’s length — check before using):'}
      </span>
      {list}
    </div>
  );
}
