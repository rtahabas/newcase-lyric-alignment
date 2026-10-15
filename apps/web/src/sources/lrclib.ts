/**
 * Thin client for LRCLIB's search endpoint (lrclib.net): free, keyless,
 * CORS-enabled. Knows the wire shape and the retry policy, nothing about
 * which result is the right one (see lyricsLookup.ts).
 */
import type { Ms } from '../lib/time';
import { secToMs } from '../lib/time';

export const LRCLIB_SEARCH = 'https://lrclib.net/api/search';

export type LyricsCandidate = {
  id: number;
  title: string;
  artist: string;
  album: string;
  durationMs: Ms | null;
  lyrics: string;
  /** LRCLIB's own line timings (LRC), offered only as an opt-in draft (decisions.md D9). */
  synced: string | null;
};

type LrclibRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number | null;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

/**
 * LRCLIB rate-limits (429 "Too many requests"); the browser often reports that
 * as a network failure because the 429 carries no CORS header. Network errors,
 * 429 and 5xx are retried with growing pauses; anything else is final.
 */
const RETRY_DELAYS_MS = [1000, 3000];

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Lookup cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchWithRetry(url: string, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.status !== 429 && res.status < 500) return res;
      if (attempt >= RETRY_DELAYS_MS.length) return res;
    } catch (e) {
      if (signal.aborted || attempt >= RETRY_DELAYS_MS.length) throw e;
    }
    await wait(RETRY_DELAYS_MS[attempt], signal);
  }
}

/**
 * One search. Plain lyrics fill the sheet; synced lyrics travel along but are
 * used only if the user opts in to a draft (decisions.md D9, revising D7.2).
 */
export async function lrclibSearch(
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<LyricsCandidate[]> {
  const res = await fetchWithRetry(`${LRCLIB_SEARCH}?${new URLSearchParams(params).toString()}`, signal);
  if (res.status === 429) throw new Error('LRCLIB is rate-limiting requests; try again in a moment');
  if (!res.ok) throw new Error(`lyrics search failed (${res.status})`);
  const records = (await res.json()) as LrclibRecord[];
  return records
    .filter((r) => !r.instrumental && r.plainLyrics?.trim())
    .map((r) => ({
      id: r.id,
      title: r.trackName,
      artist: r.artistName,
      album: r.albumName ?? '',
      durationMs: r.duration ? secToMs(r.duration) : null,
      lyrics: r.plainLyrics ?? '',
      synced: r.syncedLyrics?.trim() ? r.syncedLyrics : null,
    }));
}
