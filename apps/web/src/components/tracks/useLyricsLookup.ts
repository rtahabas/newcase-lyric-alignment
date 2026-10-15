import { useCallback, useEffect, useState } from 'react';
import type { Ms } from '../../lib/time';
import type { LyricsCandidate } from '../../sources/lyricsLookup';
import { searchLyrics } from '../../sources/lyricsLookup';

export type LookupState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; candidates: LyricsCandidate[]; timed: LyricsCandidate[] }
  | { status: 'error'; message: string };

const DEBOUNCE_MS = 600;

/**
 * Looks lyrics up as the title/artist settle (debounced, previous request
 * aborted). Waits for the audio's duration when one is coming, because the
 * duration is what makes a match trustworthy.
 */
export function useLyricsLookup(title: string, artist: string, durationMs: Ms | null, ready: boolean) {
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = title.trim();
    if (!ready || t.length < 2) {
      setState({ status: 'idle' });
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setState({ status: 'searching' });
      searchLyrics({ title: t, artist: artist.trim(), durationMs }, ctrl.signal)
        .then((r) => setState({ status: 'done', candidates: r.candidates, timed: r.timed }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [title, artist, durationMs, ready, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
